"""
Face Analysis Service - Age and Gender Detection using OpenCV DNN
Uses pre-trained Caffe models for face detection and age/gender classification.
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).parent / "models"

FACE_PROTO = str(MODELS_DIR / "opencv_face_detector.prototxt")
FACE_MODEL = str(MODELS_DIR / "opencv_face_detector.caffemodel")
AGE_PROTO = str(MODELS_DIR / "age_deploy.prototxt")
AGE_MODEL = str(MODELS_DIR / "age_net.caffemodel")
GENDER_PROTO = str(MODELS_DIR / "gender_deploy.prototxt")
GENDER_MODEL = str(MODELS_DIR / "gender_net.caffemodel")

AGE_BUCKETS = ['0-2', '4-6', '8-12', '15-20', '25-32', '38-43', '48-53', '60-100']
GENDER_LIST = ['Mann', 'Kvinne']

MODEL_MEAN_VALUES = (78.4263377603, 87.7689143744, 114.895847746)


class FaceAnalysisService:
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if FaceAnalysisService._initialized:
            return
        
        self.face_net = None
        self.age_net = None
        self.gender_net = None
        self._loaded = False
        FaceAnalysisService._initialized = True
    
    def _load_models(self):
        """Lazy load the models when first needed"""
        if self._loaded:
            return True
        
        try:
            logger.info("Loading face analysis models...")
            
            if not Path(FACE_MODEL).exists():
                logger.error(f"Face model not found: {FACE_MODEL}")
                return False
            if not Path(AGE_MODEL).exists():
                logger.error(f"Age model not found: {AGE_MODEL}")
                return False
            if not Path(GENDER_MODEL).exists():
                logger.error(f"Gender model not found: {GENDER_MODEL}")
                return False
            
            self.face_net = cv2.dnn.readNet(FACE_MODEL, FACE_PROTO)
            self.age_net = cv2.dnn.readNet(AGE_MODEL, AGE_PROTO)
            self.gender_net = cv2.dnn.readNet(GENDER_MODEL, GENDER_PROTO)
            
            self._loaded = True
            logger.info("Face analysis models loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load face analysis models: {e}")
            return False
    
    def detect_faces(self, image: np.ndarray, confidence_threshold: float = 0.7) -> list:
        """Detect faces in an image and return bounding boxes"""
        if not self._load_models():
            return []
        
        h, w = image.shape[:2]
        blob = cv2.dnn.blobFromImage(image, 1.0, (300, 300), MODEL_MEAN_VALUES, swapRB=False)
        
        self.face_net.setInput(blob)
        detections = self.face_net.forward()
        
        faces = []
        for i in range(detections.shape[2]):
            confidence = detections[0, 0, i, 2]
            if confidence > confidence_threshold:
                box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                x1, y1, x2, y2 = box.astype(int)
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(w, x2), min(h, y2)
                faces.append({
                    'box': (x1, y1, x2, y2),
                    'confidence': float(confidence)
                })
        
        return faces
    
    def predict_age_gender(self, image: np.ndarray, face_box: tuple) -> Dict[str, Any]:
        """Predict age and gender for a detected face"""
        if not self._load_models():
            return {'error': 'Models not loaded'}
        
        x1, y1, x2, y2 = face_box
        
        padding = 20
        h, w = image.shape[:2]
        x1 = max(0, x1 - padding)
        y1 = max(0, y1 - padding)
        x2 = min(w, x2 + padding)
        y2 = min(h, y2 + padding)
        
        face = image[y1:y2, x1:x2]
        
        if face.size == 0:
            return {'error': 'Invalid face region'}
        
        blob = cv2.dnn.blobFromImage(face, 1.0, (227, 227), MODEL_MEAN_VALUES, swapRB=False)
        
        self.gender_net.setInput(blob)
        gender_preds = self.gender_net.forward()
        gender_idx = gender_preds[0].argmax()
        gender = GENDER_LIST[gender_idx]
        gender_confidence = float(gender_preds[0][gender_idx])
        
        self.age_net.setInput(blob)
        age_preds = self.age_net.forward()
        age_idx = age_preds[0].argmax()
        age_range = AGE_BUCKETS[age_idx]
        age_confidence = float(age_preds[0][age_idx])
        
        return {
            'gender': gender,
            'gender_confidence': gender_confidence,
            'age_range': age_range,
            'age_confidence': age_confidence,
            'category': self._age_to_category(age_range)
        }
    
    def _age_to_category(self, age_range: str) -> str:
        """Convert age range to Norwegian category"""
        if age_range in ['0-2', '4-6', '8-12']:
            return 'barn'
        elif age_range in ['15-20']:
            return 'ungdom'
        else:
            return 'voksen'
    
    def analyze_image(self, image_path: str) -> Optional[Dict[str, Any]]:
        """Analyze an image and return face attributes"""
        try:
            image = cv2.imread(image_path)
            if image is None:
                logger.error(f"Could not read image: {image_path}")
                return None
            
            faces = self.detect_faces(image)
            
            if not faces:
                logger.warning("No faces detected in image")
                return {
                    'detected': False,
                    'message': 'Ingen ansikt funnet i bildet'
                }
            
            face = max(faces, key=lambda f: (f['box'][2] - f['box'][0]) * (f['box'][3] - f['box'][1]))
            
            result = self.predict_age_gender(image, face['box'])
            result['detected'] = True
            result['face_confidence'] = face['confidence']
            result['face_box'] = face['box']
            
            logger.info(f"Face analysis result: {result['gender']}, {result['age_range']}, category={result['category']}")
            
            return result
            
        except Exception as e:
            logger.error(f"Face analysis error: {e}")
            return {
                'detected': False,
                'error': str(e)
            }
    
    def analyze_image_bytes(self, image_bytes: bytes) -> Optional[Dict[str, Any]]:
        """Analyze image from bytes"""
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return {'detected': False, 'error': 'Could not decode image'}
            
            faces = self.detect_faces(image)
            
            if not faces:
                return {
                    'detected': False,
                    'message': 'Ingen ansikt funnet i bildet'
                }
            
            face = max(faces, key=lambda f: (f['box'][2] - f['box'][0]) * (f['box'][3] - f['box'][1]))
            
            result = self.predict_age_gender(image, face['box'])
            result['detected'] = True
            result['face_confidence'] = face['confidence']
            
            return result
            
        except Exception as e:
            logger.error(f"Face analysis error: {e}")
            return {'detected': False, 'error': str(e)}


face_analysis_service = FaceAnalysisService()
