import { Color, DoubleSide, Material, MeshBasicMaterial, Texture } from "three";

// The fuzz. Two cheap tricks that together read as fur on a primitive cat:
//  1. A Fresnel rim injected into the shared body material — silhouettes
//     catch a soft backlit glow exactly like guard hairs do. It rides
//     totalEmissiveRadiance so it survives the drift's gloom; CatGlow
//     drives its color from the palette every frame.
//  2. A translucent "halo" shell material for slightly-inflated duplicates
//     of the big body masses (desktop only) — streaky noise alpha faded by
//     the same Fresnel term, so the shell vanishes face-on and only frays
//     the silhouette.
// Budget note: emissive floor (≤0.58) + rim peak (≤0.7 × a mid color) stays
// safely under the 1.05 bloom threshold — no cat ignites except her eyes.

export const furUniforms = {
  rimColor: { value: new Color("#8a7686") },
  rimStrength: { value: 0.55 },
  rimPower: { value: 2.6 },
};

const RIM_DECLS = `
uniform vec3 furRimColor;
uniform float furRimStrength;
uniform float furRimPower;
#include <common>`;

/** Patch a Standard/Physical material with the Fresnel fur rim. */
export function applyFurRim(mat: Material): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.furRimColor = furUniforms.rimColor;
    shader.uniforms.furRimStrength = furUniforms.rimStrength;
    shader.uniforms.furRimPower = furUniforms.rimPower;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", RIM_DECLS)
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
{
  vec3 furV = normalize( vViewPosition );
  float furFres = pow( 1.0 - saturate( dot( furV, normalize( normal ) ) ), furRimPower );
  totalEmissiveRadiance += furRimColor * ( furRimStrength * furFres );
}`
      );
  };
  mat.customProgramCacheKey = () => "fur-rim";
}

const SHELL_DECLS = `
varying vec3 vFurNormal;
varying vec3 vFurViewPos;
#include <common>`;

/** The halo-shell material: unlit, streaky alpha, Fresnel-faded. */
export function makeFuzzMaterial(alphaMap: Texture): MeshBasicMaterial {
  const mat = new MeshBasicMaterial({
    color: new Color("#4a3d49"), // a lifted charcoal-plum, the rim's cousin
    alphaMap,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    side: DoubleSide, // grazing back-faces thicken the fray
  });
  mat.onBeforeCompile = (shader) => {
    // Basic materials don't carry normals — inject our own varyings.
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", SHELL_DECLS)
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vFurNormal = normalMatrix * normal;`
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
vFurViewPos = - mvPosition.xyz;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", SHELL_DECLS)
      .replace(
        "#include <alphamap_fragment>",
        `#include <alphamap_fragment>
{
  float furFres = 1.0 - abs( dot( normalize( vFurViewPos ), normalize( vFurNormal ) ) );
  diffuseColor.a *= smoothstep( 0.25, 0.85, furFres );
}`
      );
  };
  mat.customProgramCacheKey = () => "fur-shell";
  return mat;
}
