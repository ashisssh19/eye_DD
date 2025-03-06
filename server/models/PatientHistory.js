const mongoose = require('mongoose');

const HistorySchema = new mongoose.Schema({
    patient_id: { type: String, required: true },
    history: [
        {
            date: { type: Date, default: Date.now },
            scan_type: { type: String, default: "Eye Scan" },
            diagnosis: { type: String, required: true }
        }
    ]
});

const PatientHistoryModel = mongoose.model("patient_history", HistorySchema);
module.exports = PatientHistoryModel;
