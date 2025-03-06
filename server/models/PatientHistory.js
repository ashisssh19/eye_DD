const express = require("express");
const router = express.Router();
const PatientHistoryModel = require("../models/PatientHistoryModel");

router.post("/add-scan", async (req, res) => {
    const { patient_id, scan_type, diagnosis } = req.body;

    if (!patient_id || !scan_type || !diagnosis) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const result = await PatientHistoryModel.findOneAndUpdate(
            { patient_id },
            {
                $push: {
                    history: {
                        scan_type,
                        diagnosis,
                        date: new Date(),
                    },
                },
            },
            { upsert: true, new: true }
        );

        res.status(200).json({ message: "Scan added successfully", result });
    } catch (error) {
        console.error("Error adding scan:", error);
        res.status(500).json({ error: "Failed to add scan" });
    }
});

module.exports = router;