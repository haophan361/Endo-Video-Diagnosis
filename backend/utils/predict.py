import torch
from configs.constant import DEVICE, COLON_POS, COLON_FINDING, GASTRO_POS, GASTRO_FINDING
from utils.load_model import worker_models
def classification_pos(is_gastro, dataloader, start_time, end_time):
    if is_gastro:
        model_pos = worker_models.model_gastro_pos
        pos_classes = GASTRO_POS
    else:
        model_pos = worker_models.model_colon_pos
        pos_classes = COLON_POS
    
    model_pos=model_pos.to(DEVICE)
    model_pos.eval()
    
    with torch.no_grad():
        for batch in dataloader:
            batch=batch.to(DEVICE)
            
            logits = model_pos(batch)
            prob = torch.softmax(logits, dim=1)
            confidence, pred = torch.max(prob, dim=1)
            
            pred_class = pos_classes[pred[0].item()]
            pred_confidence = confidence[0].item()
    
    return {
        "class": pred_class, 
        "confidence": pred_confidence,
        "start_time": start_time,
        "end_time": end_time
    } 
    
def classification_finding(is_gastro,dataloader):
    if is_gastro:
        model_finding=worker_models.model_gastro_finding
        finding_classes=GASTRO_FINDING
    else:
        model_finding=worker_models.model_colon_finding
        finding_classes=COLON_FINDING
        
    model_finding=model_finding.to(DEVICE)
    model_finding.eval()
    results=[]
    with torch.no_grad():
        for batch in dataloader:
            
            batch=batch.to(DEVICE)
            logits=model_finding(batch)
            
            probs=torch.softmax(logits,dim=1)
            confidences, preds=torch.max(probs,dim=1) 
            
            for pred, confidence in zip(preds, confidences):
                results.append({"class":finding_classes[pred.item()],
                                "confidence": confidence.item()})
        
    return results

