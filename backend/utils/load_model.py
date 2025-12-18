import torch
from utils.model_vit_small import GastroNet_Dinov1_ViTs
from utils.model_videomae import VideoMAE
from configs.constant import DEVICE
from configs.constant import GASTRO_POS, GASTRO_FINDING, COLON_POS, COLON_FINDING
from configs.path import MODEL_DIR
from configs.setting import settings
import os
import sys
class LoadingModel:
    def __init__(self):
        self.model_gastro_pos=load_videomae_model(f"{MODEL_DIR}/{settings.model_name['gastro_pos']}",
                                                   GASTRO_POS)
        
        self.model_gastro_finding=load_vit_small_model(f"{MODEL_DIR}/{settings.model_name['gastro_finding']}",
                                                           GASTRO_FINDING)
        
        self.model_colon_pos=load_videomae_model(f"{MODEL_DIR}/{settings.model_name['colon_pos']}",
                                                         COLON_POS)
        
        self.model_colon_finding=load_vit_small_model(f"{MODEL_DIR}/{settings.model_name['colon_finding']}",
                                                          COLON_FINDING)

def load_videomae_model(model_dir,classes):
    model=VideoMAE(model_dir,len(classes))
    
    print(f"Loading VIdeoMAE ({classes}) for worker: {os.getpid()}", flush=True)
    sys.stdout.flush()
    return model

def load_vit_small_model(model_path,classes):
    model=GastroNet_Dinov1_ViTs(num_classes=len(classes))
    
    model.load_state_dict(torch.load(model_path,map_location=DEVICE),strict=True)
    print(f"Loading ViT-small ({classes}) for worker: {os.getpid()}", flush=True)
    sys.stdout.flush()
    return model

def initialize_worker_models():
    global worker_models
    if worker_models is None:
        print(f"--- Worker {os.getpid()} initializing models... ---", flush=True)
        sys.stdout.flush()
        worker_models = LoadingModel()
        print(f"--- Worker {os.getpid()} models READY. ---", flush=True)
        sys.stdout.flush()


worker_models=None
