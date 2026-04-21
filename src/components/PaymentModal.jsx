import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import Modal from './Modal';

const PaymentModal = ({ isOpen, onClose, shipmentId, method, amount, onSimulatePayment, isSimulating }) => {
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    if (isOpen && method) {
      // Generate a mock payment URL for the QR code
      const paymentUrl = `https://nexxpress.com.np/pay/${method.toLowerCase()}/checkout?shipment=${shipmentId}&amount=${amount}`;
      
      QRCode.toDataURL(paymentUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: method === 'eSewa' ? '#60BB46' : '#5C2D91',
          light: '#FFFFFF'
        }
      }).then(url => setQrDataUrl(url)).catch(err => console.error(err));
    }
  }, [isOpen, method, shipmentId, amount]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} hideCloseButton={true} maxWidth="420px">
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
            Pay via {method}
          </h2>
          <p style={{ color: 'var(--ink-500)', fontSize: '0.9rem' }}>
            Scan the QR code with your {method} app to complete the payment for shipment <strong>{shipmentId?.slice(-6).toUpperCase()}</strong>.
          </p>
        </div>

        <div style={{ 
          background: 'var(--surface-1)', padding: '16px', borderRadius: '24px', display: 'inline-block', marginBottom: '24px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
        }}>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`${method} QR Code`} style={{ width: '200px', height: '200px', borderRadius: '12px' }} />
          ) : (
            <div style={{ width: '200px', height: '200px', display: 'grid', placeItems: 'center' }}>Loading QR...</div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', padding: '0 16px' }}>
          <span style={{ color: 'var(--ink-500)' }}>Amount due:</span>
          <strong style={{ fontSize: '1.2rem', color: method === 'eSewa' ? '#60BB46' : '#5C2D91' }}>
            Rs. {amount}
          </strong>
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          <button 
            className="button-primary" 
            onClick={onSimulatePayment}
            disabled={isSimulating}
            style={{ padding: '14px', background: method === 'eSewa' ? '#60BB46' : '#5C2D91', boxShadow: 'none' }}
          >
            {isSimulating ? 'Processing Payment...' : 'Simulate Successful Scan'}
          </button>
          <button 
            className="button-ghost" 
            onClick={onClose}
            disabled={isSimulating}
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PaymentModal;
