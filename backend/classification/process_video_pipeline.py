import os
import json
import asyncio
from utils.datasets import create_dataset
from utils.predict import classification_finding, classification_pos
import cv2
from helper.invalidate_image import process_frame
from helper.frame_to_time import convert_frames_to_time
from concurrent.futures import ThreadPoolExecutor

def producer(video_path, queue, loop):
    try:
        video_capture = cv2.VideoCapture(video_path)
        fps = video_capture.get(cv2.CAP_PROP_FPS)
        
        frames = []
        frame_count = 0
        start_batch_frame_count = 0

        while video_capture.isOpened():
            ret, frame = video_capture.read()
            if not ret:
                break

            if frame_count % 10 == 0:
                valid_frame = process_frame(frame)
                if valid_frame is not None:
                    _, encoded_img = cv2.imencode(".jpg", valid_frame)
                    jpeg_decoded = cv2.imdecode(encoded_img, cv2.IMREAD_COLOR)
                    frame_rgb = cv2.cvtColor(jpeg_decoded, cv2.COLOR_BGR2RGB)
                    frames.append(frame_rgb)

            if len(frames) == 16:
                start_time = convert_frames_to_time(start_batch_frame_count, fps)
                end_time = convert_frames_to_time(frame_count, fps)
                
                future_data = asyncio.run_coroutine_threadsafe(
                    queue.put((frames.copy(), start_time, end_time)), loop
                )
                future_data.result()

                frames.clear()
                start_batch_frame_count = frame_count

            frame_count += 1
        
        if len(frames) >= 8:
            frames.extend(frames[0:16-len(frames)])
            start_time = convert_frames_to_time(start_batch_frame_count, fps)
            end_time = convert_frames_to_time(frame_count-1, fps)
            
            future_data = asyncio.run_coroutine_threadsafe(queue.put((frames.copy(),
                                                                 start_time, end_time)), loop)
            future_data.result()

    except Exception as e:
        print(f"Producer Error: {e}")
    finally:
        video_capture.release()
        asyncio.run_coroutine_threadsafe(queue.put(None), loop)

def consumer(is_gastro, frames, start_time, end_time):
    pos_dataloader,finding_dataloader=create_dataset(frames)

    pos_preds = classification_pos(is_gastro,pos_dataloader, start_time, end_time)
    finding_preds = classification_finding(is_gastro,finding_dataloader)
    return (pos_preds, finding_preds)


async def stream_processing(video_path, is_gastro, process_pool, semaphore):
    
    try:
        async with semaphore:
    
            loop = asyncio.get_event_loop()
    
            queue = asyncio.Queue(maxsize=4) 
    
            io_pool = ThreadPoolExecutor(max_workers=1)

            loop.run_in_executor(io_pool, producer, video_path, queue, loop)

            active_futures = []
    
            try:
                while True:
                    item = await queue.get()
                    if item is None:
                        break
                    
                    frames, start, end = item

                    future_data = loop.run_in_executor(process_pool, consumer, 
                                                  is_gastro, frames, start, end)

                    active_futures.append(future_data)

                    if len(active_futures) >= 2:
                        oldest_future = active_futures.pop(0)
                        result = await oldest_future
                        yield f"data: {json.dumps(result)}\n"

                for future_data in active_futures:
                    result = await future_data
                    yield f"data: {json.dumps(result)}\n"
                    
                yield f"data: {json.dumps({'status': 'done'})}\n"

            finally:
                io_pool.shutdown(wait=False)
    except Exception as e:
        print(f"Stream Error: {e}")
        yield f"data: {json.dumps({'error': str(e), 'type': 'stream_error'})}\n"
        
    finally:
        print(f"Cleaning up temp file: {video_path}")
        if os.path.exists(video_path):
            os.remove(video_path)