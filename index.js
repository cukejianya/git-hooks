#!/usr/bin/env node

const { exec } = require("child_process");
const prependFile = require('prepend-file');
const tty = require('tty');
const fs = require('fs');
const inquirer = require('inquirer');
const fuzzy = require('fuzzy');

inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

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
  type: 'autocomplete',
  name: 'type',
  message: 'What type of commit is this?',
  source: (...args) => searchTypes(...args),
}

function searchTypes(answers, input = '') {
  let choices = [
    'feat',
    'fix',
    'refactor',
    'style',
    'test',
    'build',
    'perf',
    'ci',
    'docs',
  ];
  return new Promise(function(resolve) {
    let res = fuzzy.filter(input, choices);
    resolve(res.map(el => el.string));
  });
}

let commitScope = {
  type: 'autocomplete',
  name: 'scope',
  message: '(optional) What is the scope of this commit?',
  source: (...args) => searchScopes(...args),
  suggestOnly: true,
}

async function searchScopes(answers, input = '') {
  let choices = await getPreviousScopes();
  
  return new Promise(function(resolve) {
    let res = fuzzy.filter(input, choices);
    resolve(res.map(el => el.string));
  });
}

function getPreviousScopes() {
  let cmd =`git log --pretty=format:%s -E --grep="^\\w+\\(.+\\)" --no-merges --all -1000`
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        process.exit(1);
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        process.exit(1);
      }
      let scopes = [...new Set(stdout.split('\n').map( msg => getScope(msg) ))];
      resolve(scopes.filter(elm => !!elm));
    });
  });
}

function getScope(message) {
  const regex = /^\w+\((.+)\):/;
  if (!regex.test(message)) {
    return '';
  }

  return message.match(regex)[1];
}

let questions = [
  commitType,
  commitScope,
]

var commit_msg_filepath = process.argv[2];

inquirer.prompt(questions).then( answers => {
  exec('git symbolic-ref --short HEAD', (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      process.exit(1);
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      process.exit(1);
    }
    var scope = (answers.scope) ? `(${answers.scope})` : "";
    var prefix = `${answers.type + scope}: ${getTicketNumber(stdout)} - `;
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

