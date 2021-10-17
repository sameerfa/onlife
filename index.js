#!/usr/bin/env node

const cli = require("cac")("txtl");
const textile = require("@textile/js-http-client").default;
var readline = require("readline");
const chalk = require("chalk");
const { emojify } = require("node-emoji");

const { log } = console;

// Create 'default' chat command
cli
  .command("", "Starts an interactive chat session in a thread.")
  .action((opts) => {
    // Specify our readline interface
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });
    // Run callback for each input on stdin
    rl.on("line", (line) => {
      if (line !== "") {
        textile.messages.add(opts.thread, emojify(line)).then(() => {
          rl.prompt();
        });
      }
    });
    // Get our 'local' profile info...
    textile.profile.get().then((peer) => {
      // ... and then create a custom prompt
      rl.setPrompt(chalk.green(peer.name || peer.address.slice(7)) + "\t");
      rl.prompt(); // Display prompt to get started
      // Only subscribe to text events on the specified thread
      textile.subscribe.stream(["TEXT"], opts.thread).then((stream) => {
        // All js-http-client stream endpoints return a ReadableSream
        const reader = stream.getReader();
        const read = (result) => {
          if (result.done) {
            return;
          }
          // Extract the text update and display it nicely...
          try {
            const item = result.value.payload;
            const name = item.user.name || item.user.address.slice(7);
            if (item.user.address !== peer.address) {
              readline.clearLine(process.stdout, 0);
              readline.cursorTo(process.stdout, 0);
              log(chalk.cyan(name) + "\t" + chalk.grey(item.body));
              rl.prompt();
            }
          } catch (err) {
            reader.cancel(undefined);
            return;
          }
          // Keep reading from the stream
          reader.read().then(read);
        };
        // Start reading from the stream
        reader.read().then(read);
      });
    });
  })
  .option("--thread [thread]", "Thread ID. Omit to use the 'default' thread.", {
    default: "default",
    type: [String],
  });

// Display help message when `-h` or `--help` appears
cli.help();
// Display version number when `-v` or `--version` appears
cli.version("1.0.0");
// Parse stdin
cli.parse();
