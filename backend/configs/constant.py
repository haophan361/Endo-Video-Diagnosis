import torch

GASTRO_POS=['antrum', 'duodenal','esophagus','fundus-cardia','incisura','lower-body', 'middle-upper-body']

COLON_POS=["anal_canal","ascending_colon","ceacum","descending_colon","rectum","sigmoid_colon",
           "terminal_ileum","transverse_colon"]

GASTRO_FINDING=['barretts', 'blood-in-lumen', 'erosion','esophagitis', 'gerd','normal stomach',
                'normal-z-line', 'polyps', 'tumor']

COLON_FINDING=['blood-in-lumen','colorectal-cancer', 'erosion','normal colon','polyps', 'tumor','ulcerative-colitis']

DEVICE=torch.device("cuda" if torch.cuda.is_available() else "cpu")

MEAN=[0.485, 0.486, 0.406]
STD=[0.229, 0.224, 0.225]

IMAGE_SIZE=224

MAX_CONCURRENT_VIDEO=2

NUM_WORKERS=2