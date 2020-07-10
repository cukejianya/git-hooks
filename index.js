#!/usr/bin/env node

const { exec } = require("child_process");
const prependFile = require('prepend-file');
const tty = require('tty');
const fs = require('fs');
var inquirer = require('inquirer');

if (!process.stdin.isTTY) {
  const { O_RDONLY, O_NOCTTY } = fs.constants;
  let fd;
  try {
    fd = fs.openSync('/dev/tty', O_RDONLY + O_NOCTTY);
  } catch (error) {
    console.error('Please push your code in a terminal.');
    process.exit(1);
  }

  const stdin = new tty.ReadStream(fd);

  Object.defineProperty(process, 'stdin', {
    configurable: true,
    enumerable: true,
    get: () => stdin,
  });
}

let commitType = {
  type: 'list',
  name: 'type',
  message: 'What type of commit is this?',
  default: 0,
  choices: [
    'feat',
    'fix',
    'refactor',
    'style',
    'test',
    'build',
    'perf',
    'ci',
    'docs',
  ]
}

let commitScope = {
  name: 'scope',
  message: '(optional) What is the scope of this commit?'
}

let questions = [
  commitType,
  commitScope,
]

var commit_msg_filepath = process.argv[2];
var prompt = inquirer.createPromptModule();

prompt(questions).then( answers => {
  exec('git symbolic-ref --short HEAD', (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    var prefix = `${getTicketNumber(stdout)} ${answers.type}`;
    prefix += (answers.scope) ? `(${answers.scope}): ` : ": ";
    prependFile(commit_msg_filepath, prefix, (err) => {
      if (err) {
        process.exit(1);
      }
      process.exit(0);
    });
  });
})

function getTicketNumber(branch) {
  const regex = /TECHCO-\d+/g;
  return branch.match(regex);
}

