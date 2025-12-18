def convert_frames_to_time(frame_count, fps):    
    total_seconds = frame_count / fps
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    
    return f"{int(hours):02}:{int(minutes):02}:{int(seconds):02}"