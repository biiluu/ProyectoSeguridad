const multer = require('multer');

const storage = multer.memoryStorage();

const multerInstance = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // Límite de transporte 10 MB; validación estricta a 5 MB en controlador
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (file && file.mimetype && allowedMimes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen (JPG, PNG, WebP).'), false);
    }
  }
});

/**
 * Middleware flexible de carga de fotografía de producto.
 * Admite el archivo bajo el campo 'imagen' o 'foto' y lo expone en req.file.
 */
function uploadImage(req, res, next) {
  multerInstance.any()(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'La imagen excede el tamaño máximo permitido.' });
      }
      return res.status(400).json({ message: err.message || 'Error al procesar la imagen subida.' });
    }

    if (req.files && req.files.length > 0) {
      const preferido = req.files.find(f => f.fieldname === 'imagen' || f.fieldname === 'foto');
      req.file = preferido || req.files[0];
    }

    return next();
  });
}

uploadImage.single = multerInstance.single.bind(multerInstance);

module.exports = uploadImage;
