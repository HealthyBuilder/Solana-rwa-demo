"use client";

import { useState } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import labubuMetadata from "../../labubu-metadata.json";

export function LabubuCard() {
  const { wallet, status } = useWalletConnection();
  const [selectedLabubu, setSelectedLabubu] = useState<number | null>(null);

  // Mock random Labubu NFT minting
  const handleMint = async () => {
    if (!wallet || status !== "connected") {
      alert("Please connect your wallet first!");
      return;
    }

    try {
      // Simulated random selection logic
      // Frontend generates random number, on-chain should use on-chain randomness
      const totalWeight = labubuMetadata.labubus.reduce((sum, l) => sum + l.supply, 0);
      const random = Math.floor(Math.random() * totalWeight);

      let cumulative = 0;
      let selected = labubuMetadata.labubus[0];

      for (const labubu of labubuMetadata.labubus) {
        cumulative += labubu.supply;
        if (random < cumulative) {
          selected = labubu;
          break;
        }
      }

      // TODO: Call on-chain program to mint NFT
      // await mintLabubuNFT(selected.id);

      setSelectedLabubu(selected.id);
    } catch (error: any) {
      alert("Failed to mint Labubu. " + (error.message || "Please try again."));
    }
  };

  const isConnected = status === "connected";
  const currentLabubu = selectedLabubu
    ? labubuMetadata.labubus.find((l) => l.id === selectedLabubu)
    : null;

  return (
    <div className="card">
      <h2>Labubu Mystery Box</h2>
      <p className="subtitle">
        {isConnected
          ? "Click the button to open your mystery box!"
          : "Connect your wallet to get started"}
      </p>

      <div className="labubu-display">
        {!selectedLabubu ? (
          <div className="mystery-box">
            <div className="box-icon">?</div>
            <p>Mystery Box</p>
          </div>
        ) : (
          <div className="labubu-reveal">
            <img
              src={currentLabubu?.image}
              alt={currentLabubu?.name}
              className="labubu-image"
            />
            <h3>{currentLabubu?.name}</h3>
            <p className="description">{currentLabubu?.description}</p>
            <div className="attributes">
              {currentLabubu?.attributes.map((attr, i) => (
                <span key={i} className="badge">
                  {attr.trait_type}: {attr.value}
                </span>
              ))}
            </div>
            {currentLabubu?.rarity === "legendary" && (
              <div className="legendary-badge">🌟 LEGENDARY 🌟</div>
            )}
          </div>
        )}
      </div>

      <button
        className="btn-primary"
        onClick={handleMint}
        disabled={!isConnected}
      >
        Open Mystery Box
      </button>

      <div className="collection-stats">
        <p>Total Labubus: {labubuMetadata.labubus.length} types</p>
        <p>
          Legendary Supply:{" "}
          {labubuMetadata.labubus.find((l) => l.rarity === "legendary")?.supply || 0}
        </p>
      </div>

      <style jsx>{`
        .card {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          max-width: 500px;
          margin: 0 auto;
        }

        h2 {
          margin: 0 0 0.5rem 0;
          font-size: 1.75rem;
          color: #333;
        }

        .subtitle {
          color: #666;
          margin-bottom: 1.5rem;
        }

        .labubu-display {
          min-height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 1.5rem 0;
          border: 2px dashed #ddd;
          border-radius: 8px;
          padding: 2rem;
        }

        .mystery-box {
          text-align: center;
        }

        .box-icon {
          font-size: 8rem;
          color: #ff6b9d;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .labubu-reveal {
          text-align: center;
          animation: fadeIn 0.5s ease-in;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .labubu-image {
          max-width: 300px;
          width: 100%;
          height: auto;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        h3 {
          font-size: 1.5rem;
          color: #333;
          margin: 0.5rem 0;
        }

        .description {
          color: #666;
          margin-bottom: 1rem;
        }

        .attributes {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .badge {
          background: #f0f0f0;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.875rem;
          color: #555;
        }

        .legendary-badge {
          background: linear-gradient(45deg, #ffd700, #ffed4e);
          color: #333;
          font-weight: bold;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          margin-top: 1rem;
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }

        .tx-link {
          display: inline-block;
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: #667eea;
          color: white;
          border-radius: 6px;
          text-decoration: none;
          font-size: 0.875rem;
          transition: background 0.2s;
        }

        .tx-link:hover {
          background: #5568d3;
        }

        .btn-primary {
          width: 100%;
          padding: 1rem;
          font-size: 1.125rem;
          font-weight: 600;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(102, 126, 234, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .collection-stats {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #eee;
          text-align: center;
          color: #666;
          font-size: 0.875rem;
        }

        .collection-stats p {
          margin: 0.25rem 0;
        }
      `}</style>
    </div>
  );
}
