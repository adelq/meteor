var assert = require("assert");
var inspector = require("node-inspector");
var inspectorBinPath = require.resolve("node-inspector/bin/inspector");
var spawn = require("child_process").spawn;
var chalk = require("chalk");
var EOL = require("os").EOL;
var debugPortToProcess = [];
var hasOwn = Object.prototype.hasOwnProperty;

function start(debugPort) {
  debugPort = +(debugPort || 5858);

  // Keep the relationship between the debug port and the web port
  // predictable so that the URL can be easily reloaded/bookmarked.
  var webPort = 8080 + debugPort - 5858;

  if (hasOwn.call(debugPortToProcess, debugPort)) {
    return debugPortToProcess[debugPort];
  }

  var proc = spawn(process.execPath, [
    inspectorBinPath,
    "--web-port", "" + webPort,
    "--debug-port", "" + debugPort
  ]);

  proc.url = inspector.buildInspectorUrl(
    "localhost",
    webPort,
    debugPort
  );

  // Forward error output to process.stderr, but silence normal output.
  // proc.stdout.pipe(process.stdout);
  proc.stderr.pipe(process.stderr);

  proc.on("exit", function(code) {
    // Restart the process if it died without us explicitly stopping it.
    if (debugPortToProcess[debugPort] === proc) {
      delete debugPortToProcess[debugPort];
      start(debugPort);
    }
  });

  debugPortToProcess[debugPort] = proc;

  return proc;
}

function banner(debugPort) {
  debugPort = +(debugPort || 5858);
  var proc = debugPortToProcess[debugPort];
  assert.strictEqual(typeof proc.url, "string");

  return [
    "",
    chalk.green([
      "Your application is now paused and ready for debugging!",
      "",
      "To debug the server process using a graphical debugging interface, ",
      "visit this URL in your web browser:"
    ].join(EOL)),
    chalk.cyan(proc.url),
    "",
    chalk.green([
      "To debug the server process using the command-line node debugger, ",
      "execute this command in another terminal window:",
    ].join(EOL)),
    chalk.cyan("node debug localhost:" + debugPort),
    EOL
  ].join(EOL);
}

function stop(debugPort) {
  debugPort = +(debugPort || 5858);

  var proc = debugPortToProcess[debugPort];
  if (proc.kill) {
    console.error("killed " + proc.pid);
    proc.kill();
  }

  delete debugPortToProcess[debugPort];
}

require("./cleanup.js").onExit(function killAll() {
  for (var debugPort in debugPortToProcess) {
    stop(debugPort);
  }
  debugPortToProcess.length = 0;
});

exports.start = start;
exports.banner = banner;
exports.stop = stop;
