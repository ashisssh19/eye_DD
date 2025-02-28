from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
from tensorflow.keras.preprocessing import image
import numpy as np
import io
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Load the Keras (.h5) model
MODEL_PATH = "model.h5"
model = tf.keras.models.load_model(MODEL_PATH)
logger.info("✅ Model loaded successfully!")
logger.info(f"Model summary: {model.summary()}")
logger.info(f"Model output shape: {model.output_shape}")

# Define image preprocessing
def preprocess_image(img_array):
    # Resize to match model input
    img_array = tf.image.resize(img_array, (224, 224))
    # Add batch dimension if needed
    if len(img_array.shape) == 3:
        img_array = np.expand_dims(img_array, axis=0)
    # Normalize pixel values
    img_array = img_array / 255.0
    return img_array

# Class labels (adjust these based on your dataset)
class_labels = ["Normal", "Glaucoma", "Diabetic Retinopathy", "Cataract"]

@app.route("/predict", methods=["POST"])
def predict():
    if "images" not in request.files:
        return jsonify({"error": "No images provided"}), 400

    # Get patient ID if provided
    patient_id = request.form.get("patientId", "Unknown")
    logger.info(f"Processing request for patient ID: {patient_id}")
    
    images = request.files.getlist("images")
    logger.info(f"Received {len(images)} images")
    
    predictions = []
    prediction_scores = []

    for i, img_file in enumerate(images):
        try:
            # Read image file
            img_bytes = img_file.read()
            img = tf.image.decode_image(img_bytes, channels=3)
            
            # Preprocess image
            processed_img = preprocess_image(img)
            
            # Debug info
            logger.info(f"Image {i+1} shape after preprocessing: {processed_img.shape}")
            logger.info(f"Image {i+1} value range: {np.min(processed_img)} to {np.max(processed_img)}")
            
            # Perform inference
            output = model.predict(processed_img, verbose=0)
            logger.info(f"Raw prediction for image {i+1}: {output}")
            
            # Get class with highest probability
            predicted_class_idx = np.argmax(output, axis=1)[0]
            confidence = float(output[0][predicted_class_idx])
            
            # Store prediction and confidence
            prediction = class_labels[predicted_class_idx]
            predictions.append(f"{prediction} (Confidence: {confidence:.2%})")
            prediction_scores.append({
                "class": prediction,
                "confidence": confidence,
                "all_scores": {class_labels[j]: float(output[0][j]) for j in range(len(class_labels))}
            })
            
            logger.info(f"Predicted class for image {i+1}: {prediction} with confidence {confidence:.2%}")

        except Exception as e:
            logger.error(f"Error processing image {i+1}: {str(e)}", exc_info=True)
            predictions.append(f"Error: {str(e)}")
            prediction_scores.append({"error": str(e)})

    return jsonify({
        "patientId": patient_id,
        "predictions": predictions,
        "detailed_results": prediction_scores
    })

@app.route("/test", methods=["GET"])
def test():
    """Simple endpoint to test if the server is running"""
    return jsonify({"status": "ok", "message": "Server is running"})

if __name__ == "__main__":
    # Print model and environment info at startup
    logger.info(f"TensorFlow version: {tf.__version__}")
    logger.info(f"Backend: {tf.config.list_physical_devices()}")
    logger.info(f"Available classes: {class_labels}")
    
    app.run(host="0.0.0.0", port=5000, debug=True)