import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const QRCodeCard = ({ value, label = 'Delivery QR' }) => {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    let active = true;

    const renderCode = async () => {
      if (!value) {
        setDataUrl('');
        return;
      }

      try {
        const nextUrl = await QRCode.toDataURL(value, {
          margin: 1,
          width: 220,
          color: {
            dark: '#122238',
            light: '#ffffff',
          },
        });

        if (active) {
          setDataUrl(nextUrl);
        }
      } catch {
        if (active) {
          setDataUrl('');
        }
      }
    };

    renderCode();

    return () => {
      active = false;
    };
  }, [value]);

  if (!value) {
    return null;
  }

  return (
    <div className="qr-card">
      <div>
        <small>{label}</small>
        <strong>Scan to verify delivery</strong>
      </div>
      {dataUrl ? <img src={dataUrl} alt="Delivery verification QR" /> : null}
      <code>{value}</code>
    </div>
  );
};

export default QRCodeCard;
