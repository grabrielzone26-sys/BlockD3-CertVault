const express = require('express');
const crypto = require('crypto');

const router = express.Router();

router.post('/calculate-hash', (req, res) => {
  try {
    const { fileContent } = req.body;
    if (!fileContent) {
      return res.status(400).json({
        success: false,
        error: 'fileContent is required'
      });
    }

    const match = fileContent.match(/^data:.*;base64,(.*)$/);
    const base64Data = match ? match[1] : fileContent;
    const buffer = Buffer.from(base64Data, 'base64');

    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    return res.json({
      success: true,
      hash
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
