import { useMemo, useReducer } from "react";
import { DEVICES_BY_ID, MAC_DEVICES, priceContrast } from "./pricing";

// Default to the line whose contrast is the most quoted: the $1,699 → $1,999
// MacBook Pro 14".
const DEFAULT_DEVICE_ID = "macbook-pro-14-m5";

const baseSelection = (device) => ({
  memory: device.base.memory,
  storage: device.base.storage,
});

function init(deviceId) {
  const device = DEVICES_BY_ID[deviceId] || MAC_DEVICES[0];
  return { deviceId: device.id, ...baseSelection(device) };
}

function reducer(state, action) {
  switch (action.type) {
    case "device": {
      // Switching device resets options to that device's base config so we
      // never carry an option a model doesn't offer.
      return init(action.deviceId);
    }
    case "memory":
      return { ...state, memory: action.gb };
    case "storage":
      return { ...state, storage: action.gb };
    case "reset":
      return init(state.deviceId);
    default:
      return state;
  }
}

// Single source of truth for the configurator: which device, which rungs, and
// the derived before/after contrast. Components stay presentational.
export function usePriceConfig(initialDeviceId = DEFAULT_DEVICE_ID) {
  const [state, dispatch] = useReducer(reducer, initialDeviceId, init);
  const device = DEVICES_BY_ID[state.deviceId];

  const selection = { memory: state.memory, storage: state.storage };
  const contrast = useMemo(
    () => priceContrast(device, selection),
    [device, state.memory, state.storage]
  );

  const isBaseConfig =
    state.memory === device.base.memory &&
    state.storage === device.base.storage;

  return {
    device,
    selection,
    contrast,
    isBaseConfig,
    setDevice: (deviceId) => dispatch({ type: "device", deviceId }),
    setMemory: (gb) => dispatch({ type: "memory", gb }),
    setStorage: (gb) => dispatch({ type: "storage", gb }),
    reset: () => dispatch({ type: "reset" }),
  };
}
