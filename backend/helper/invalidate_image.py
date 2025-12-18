import numpy as np
import cv2

def invalidate_frame(brightness_min,brightness_max,blur_score,gray_frame):
    
    dark_pixels = np.sum(gray_frame < brightness_min) / gray_frame.size
    bright_pixels = np.sum(gray_frame > brightness_max) / gray_frame.size
    
    variance = cv2.Laplacian(gray_frame, cv2.CV_64F).var()
    
    return dark_pixels < 0.8 and bright_pixels < 0.6 and variance > blur_score

def process_frame(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)
    if not invalidate_frame(50, 150, 50, gray):
        return None
    else:
        return frame