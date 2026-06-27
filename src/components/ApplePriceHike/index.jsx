import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import DevicePicker from "./DevicePicker";
import OptionGroup from "./OptionGroup";
import PriceContrast from "./PriceContrast";
import Breakdown from "./Breakdown";
import SourcesPanel from "./SourcesPanel";
import { usePriceConfig } from "./usePriceConfig";
import { HIKE_DATE, STANDFIRST } from "./pricing";
import { SF, MONO, COLORS } from "./theme";

// "The Memory Tax" — configure a MacBook or iPad and watch last week's price
// turn into today's. An art piece about the moment a global memory shortage
// stopped being an enterprise line item and became a consumer sticker.
const ApplePriceHike = () => {
  const {
    device,
    selection,
    contrast,
    isBaseConfig,
    setDevice,
    setMemory,
    setStorage,
    reset,
  } = usePriceConfig();

  useEffect(() => {
    document.title = "The Memory Tax — Apple's price hike, configured";
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.canvas }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-20 backdrop-blur-md border-b"
        style={{ backgroundColor: "rgba(245,245,247,0.8)", borderColor: COLORS.hairline }}
      >
        <div className="max-w-5xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="text-sm transition-opacity hover:opacity-60"
            style={{ fontFamily: SF, color: COLORS.muted }}
          >
            &larr; Shreyans Khunteta
          </Link>
          <span className="text-[11px]" style={{ fontFamily: MONO, color: COLORS.muted }}>
            Effective {HIKE_DATE}
          </span>
        </div>
      </header>

      {/* Standfirst */}
      <section className="max-w-3xl mx-auto px-5 sm:px-6 pt-12 sm:pt-16 pb-8">
        <p
          className="text-[11px] uppercase tracking-[0.2em] mb-4"
          style={{ fontFamily: MONO, color: COLORS.rise }}
        >
          The Memory Tax
        </p>
        <h1
          className="text-3xl sm:text-5xl font-semibold tracking-tight mb-5"
          style={{ fontFamily: SF, color: COLORS.ink }}
        >
          The same machine. One week apart.
        </h1>
        <p className="text-base sm:text-lg leading-relaxed" style={{ fontFamily: SF, color: COLORS.muted }}>
          {STANDFIRST}
        </p>
      </section>

      {/* Configurator */}
      <section className="max-w-5xl mx-auto px-5 sm:px-6 pb-16">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-10">
          {/* Left: choose the machine */}
          <div className="flex flex-col gap-8">
            <div>
              <p className="text-[11px] uppercase tracking-widest mb-3" style={{ fontFamily: MONO, color: COLORS.muted }}>
                1 · Choose a machine
              </p>
              <DevicePicker device={device} onSelect={setDevice} />
              <p className="text-xs mt-3 italic" style={{ fontFamily: SF, color: COLORS.muted }}>
                {device.blurb}
              </p>
            </div>

            {device.memory.length > 1 && (
              <div>
                <p className="text-[11px] uppercase tracking-widest mb-3" style={{ fontFamily: MONO, color: COLORS.muted }}>
                  2 · Unified memory
                </p>
                <OptionGroup
                  title="Memory"
                  options={device.memory}
                  selected={selection.memory}
                  onSelect={setMemory}
                />
              </div>
            )}

            {device.storage.length > 1 && (
              <div>
                <p className="text-[11px] uppercase tracking-widest mb-3" style={{ fontFamily: MONO, color: COLORS.muted }}>
                  {device.memory.length > 1 ? "3" : "2"} · Storage
                </p>
                <OptionGroup
                  title="Storage"
                  options={device.storage}
                  selected={selection.storage}
                  onSelect={setStorage}
                />
              </div>
            )}
          </div>

          {/* Right: the contrast + receipt */}
          <div className="flex flex-col gap-6 lg:sticky lg:top-20 lg:self-start">
            <PriceContrast contrast={contrast} deviceName={device.name} />

            <div
              className="rounded-2xl p-6 sm:p-7"
              style={{ backgroundColor: COLORS.surface, boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold" style={{ fontFamily: SF, color: COLORS.ink }}>
                  Where the increase comes from
                </h2>
                {!isBaseConfig && (
                  <button
                    onClick={reset}
                    className="text-xs transition-opacity hover:opacity-60"
                    style={{ fontFamily: MONO, color: COLORS.muted }}
                  >
                    reset
                  </button>
                )}
              </div>
              <Breakdown device={device} selection={selection} contrast={contrast} />
            </div>
          </div>
        </div>
      </section>

      <SourcesPanel />
    </div>
  );
};

export default ApplePriceHike;
