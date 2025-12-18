from torch.utils.data import Dataset,DataLoader
import torch
from torchvision.transforms import Compose, Normalize, ToTensor,Resize,ToPILImage
from configs.constant import MEAN,STD,IMAGE_SIZE
import cv2
import numpy as np
class ImageDataset(Dataset):
    def __init__(self,tensor_frames):
        self.tensor_frames=tensor_frames
    
    def __len__ (self):
        return len(self.tensor_frames)
    
    def __getitem__(self, index):
        return self.tensor_frames[index]
    
class SequenceDataset(Dataset):
    def __init__(self, tensor_frames):
        self.tensor_frames = torch.stack(tensor_frames, dim=0)
    
    def __len__(self):
        return 1
    
    def __getitem__(self, index):
        return self.tensor_frames
    
def create_dataset(frames):
    transform = Compose([
        ToPILImage(),
        Resize((IMAGE_SIZE,IMAGE_SIZE)),
        ToTensor(),
        Normalize(MEAN, STD)
    ])

    processed_frames = []
    for frame in frames:
        processed_frames.append(frame)
        
    tensor_frames = [transform(frame) for frame in processed_frames]
    
    indices = np.linspace(0, len(tensor_frames) - 1, num=4, dtype=int)
    image_tensors = [tensor_frames[i] for i in indices]

    image_dataset = ImageDataset(image_tensors)
    image_dataloader = DataLoader(image_dataset, batch_size=4)

    sequence_dataset = SequenceDataset(tensor_frames)
    sequence_dataloader = DataLoader(sequence_dataset, batch_size=1)

    return sequence_dataloader, image_dataloader
    
