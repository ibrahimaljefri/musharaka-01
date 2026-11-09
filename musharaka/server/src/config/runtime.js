/**
 * Runtime detection.
 *
 * Passenger (cPanel Node.js Selector) loads the startup file through its own
 * node-loader, so `require.main === module` is false there, yet the app must
 * still call listen(): Passenger intercepts the call and binds its own socket.
 * Without it every request waits until it times out.
 */

function isPassenger(scope = globalThis) {
  return typeof scope.PhusionPassenger !== 'undefined'
}

function shouldListen({ isMain, passenger = globalThis.PhusionPassenger }) {
  return Boolean(isMain) || typeof passenger !== 'undefined'
}

module.exports = { shouldListen, isPassenger }
