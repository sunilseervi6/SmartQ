import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

/**
 * ImageUpload Component
 * Drag & drop image upload with preview
 * Optional - users can skip if they don't want to upload images
 */
export default function ImageUpload({ onImagesSelected, maxImages = 10 }) {
  const [previewImages, setPreviewImages] = useState([]);
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError('');

    // Check for rejected files
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(file => file.errors[0].message);
      setError(errors.join(', '));
      return;
    }

    // Check total images limit
    if (previewImages.length + acceptedFiles.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    // Create preview URLs
    const newPreviews = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setPreviewImages(prev => [...prev, ...newPreviews]);
    onImagesSelected([...previewImages.map(p => p.file), ...acceptedFiles]);
  }, [previewImages, maxImages, onImagesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: true
  });

  const removeImage = (index) => {
    const newPreviews = previewImages.filter((_, i) => i !== index);
    setPreviewImages(newPreviews);
    onImagesSelected(newPreviews.map(p => p.file));
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <label className="form-label">
        Shop Images (Optional)
        <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginLeft: '0.5rem' }}>
          Max {maxImages} images, 5MB each
        </span>
      </label>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? 'var(--primary-teal)' : 'var(--gray-300)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '2rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragActive ? 'var(--light-teal)' : 'var(--gray-50)',
          transition: 'all 0.2s'
        }}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p style={{ color: 'var(--primary-teal)', margin: 0 }}>
            Drop images here...
          </p>
        ) : (
          <div>
            <p style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }}>📸</p>
            <p style={{ color: 'var(--gray-600)', margin: '0 0 0.5rem 0' }}>
              Drag & drop images here, or click to select
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', margin: 0 }}>
              PNG, JPG, JPEG, WebP up to 5MB
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div style={{ marginTop: '0.5rem', color: 'var(--error)', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Image previews */}
      {previewImages.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h4 style={{ fontSize: '0.875rem', color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
            Selected Images ({previewImages.length}/{maxImages})
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '1rem'
          }}>
            {previewImages.map((preview, index) => (
              <div
                key={index}
                style={{
                  position: 'relative',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '2px solid var(--gray-200)',
                  aspectRatio: '1'
                }}
              >
                <img
                  src={preview.preview}
                  alt={`Preview ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  style={{
                    position: 'absolute',
                    top: '0.25rem',
                    right: '0.25rem',
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem'
                  }}
                  title="Remove image"
                >
                  ×
                </button>
                {index === 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '0.25rem',
                      left: '0.25rem',
                      background: 'var(--primary-teal)',
                      color: 'white',
                      padding: '0.125rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}
                  >
                    Primary
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
