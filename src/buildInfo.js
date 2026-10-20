export const isProductionRelease = import.meta.env.PROD;
export const releaseLabel = isProductionRelease ? 'Production release' : 'Development build';
export const dataModeLabel = isProductionRelease ? 'Local browser data' : 'Local development data';
