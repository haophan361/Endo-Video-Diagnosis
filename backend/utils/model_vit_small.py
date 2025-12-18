import timm
import torch.nn as nn

class GastroNet_Dinov1_ViTs(nn.Module):
    def __init__(self, num_classes,dropout_rate=0.3):
        super().__init__()
        
        self.backbone=timm.create_model('vit_small_patch16_224', pretrained=False)
        self.embed_dim = self.backbone.num_features
        
        self.head = nn.Sequential(
            nn.LayerNorm(self.embed_dim),
            nn.Dropout(dropout_rate),
            nn.Linear(self.embed_dim, num_classes)
        )

    def forward(self, x):
        x = self.backbone.forward_features(x)
        x = self.backbone.forward_head(x, pre_logits=True)
        x = self.head(x)
        return x


