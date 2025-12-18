from transformers import AutoModelForVideoClassification, AutoConfig
import  torch.nn as nn
class VideoMAE(nn.Module):
    def __init__(self, model_dir, num_labels):
        super().__init__()
        config = AutoConfig.from_pretrained(model_dir, local_files_only=True)
        if num_labels:
            config.num_labels = num_labels
        
        self.model = AutoModelForVideoClassification.from_pretrained(model_dir,
                                                                     config=config,
                                                                     local_files_only=True)
    def forward(self,x):
        outputs = self.model(x)
        return outputs.logits