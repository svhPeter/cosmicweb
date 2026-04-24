/**
 * Astronomical constants used by the physics module.
 *
 * All units are base SI / astronomical unless otherwise noted. We keep the
 * surface tiny on purpose — more constants can be added when we wire up
 * real ephemeris providers (JPL Horizons, DE440) in a later phase.
 */

/** Astronomical Unit in kilometers (IAU 2012 definition). */
export const AU_KM = 149_597_870.7;

/** Standard gravitational parameter of the Sun, km³/s². */
export const GM_SUN = 1.32712440018e11;

/** Julian Date of the J2000.0 epoch (2000-01-01 12:00 TT). */
export const JD_J2000 = 2_451_545.0;

/** Seconds per Julian day. */
export const SECONDS_PER_DAY = 86_400;

/** Convert degrees to radians. */
export const DEG2RAD = Math.PI / 180;

/** Convert radians to degrees. */
export const RAD2DEG = 180 / Math.PI;
