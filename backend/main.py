from concurrent.futures import ProcessPoolExecutor
from fastapi import FastAPI, UploadFile, File, Query, Request
from starlette.responses import StreamingResponse
import aiofiles
import tempfile
from pathlib import Path
import uuid
from utils.load_model import initialize_worker_models
from contextlib import asynccontextmanager
from classification.process_video_pipeline import stream_processing
import asyncio
from fastapi.middleware.cors import CORSMiddleware
from configs.constant import MAX_CONCURRENT_VIDEO, NUM_WORKERS
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("--- Server starting up... Creating Process Pool ---")
    pool = ProcessPoolExecutor(max_workers=NUM_WORKERS,initializer=initialize_worker_models)
    app.state.pool = pool
    print("--- Process Pool created ---")

    yield

    print("--- Server shutting down... Closing Process Pool ---")
    app.state.pool.shutdown(wait=True)
    print("--- Process Pool closed ---")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

video_semaphore=asyncio.Semaphore(MAX_CONCURRENT_VIDEO)

@app.post("/predict")
async def predict(request: Request,file: UploadFile = File(...),
                  is_gastroscopy: bool = Query(...)):
    
    temp_dir = Path(tempfile.gettempdir())
    tmp_path = temp_dir / f"{uuid.uuid4()}.mp4"
    async with aiofiles.open(tmp_path, "wb") as out_file:
        while chunk := await file.read(8 * 1024 * 1024):
            await out_file.write(chunk)
    
    print(f"File saved to: {tmp_path}")

    return StreamingResponse(stream_processing(str(tmp_path), is_gastroscopy, request.app.state.pool, video_semaphore), 
                             media_type="text/event-stream")