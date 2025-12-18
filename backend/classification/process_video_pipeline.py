import os
import json
import asyncio
from utils.datasets import create_dataset
from utils.predict import classification_finding, classification_pos
import cv2
from helper.invalidate_image import process_frame
from helper.frame_to_time import convert_frames_to_time

def producer(video_path):
    frames = []
    frame_count = 0
    try:
        video_capture = cv2.VideoCapture(video_path)
        if not video_capture.isOpened():
            raise IOError(f"Cannot open video file: {video_path}")
    except Exception as e:
        print(f"Error opening video: {e}")
        raise
    
    video_capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
    start_batch_frame_count = 0
    fps= video_capture.get(cv2.CAP_PROP_FPS) 
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
        
        if len(frames)==16:
            
            start_time = convert_frames_to_time(start_batch_frame_count, fps)
            end_time = convert_frames_to_time(frame_count, fps)
            
            yield (frames, start_time, end_time) 
            
            frames.clear()
            start_batch_frame_count = frame_count
            
        frame_count+=1
        
    if len(frames) >=8:
        frames.extend(frames[0:16-len(frames)])
        
        start_time = convert_frames_to_time(start_batch_frame_count, fps)
        end_time = convert_frames_to_time(frame_count-1, fps)
        
        yield (frames, start_time, end_time)
        frames.clear()

    video_capture.release()

def consumer(is_gastro, frames, start_time, end_time):
    pos_dataloader,finding_dataloader=create_dataset(frames)

    pos_preds = classification_pos(is_gastro,pos_dataloader, start_time, end_time)
    finding_preds = classification_finding(is_gastro,finding_dataloader)
    return (pos_preds, finding_preds)

async def stream_processing(video_path, is_gastro, pool):
    loop = asyncio.get_event_loop()
    try:
        for frames, start_time, end_time in producer(video_path):
            try:
                result_batch = await loop.run_in_executor(pool, consumer, is_gastro,
                                                          frames, start_time, end_time)
                
                yield f"data: {json.dumps(result_batch)}\n\n"
            except Exception as e:
                print(f"Error processing batch: {e}")
                error_msg = {"error": str(e), "type": "processing_error"}
                yield f"data: {json.dumps(error_msg)}\n\n"
                raise
        
        yield f"data: {json.dumps({'status': 'done'})}\n\n"
    except Exception as e:
        print(f"Error in stream processing: {e}")
        error_msg = {"error": str(e), "type": "stream_error"}
        yield f"data: {json.dumps(error_msg)}\n\n"
    finally:
        print("Cleaning up temp file...")
        if os.path.exists(video_path):
            try:
                os.remove(video_path)
            except Exception as e:
                print(f"Error removing temp file: {e}")


