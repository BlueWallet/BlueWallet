/**
 * Flags `if (!process.env.X) return` inside `it` / `test` / `describe`.
 * Jest records that as a pass with zero assertions. Use itIfEnv / describeIfEnv.
 */

const TEST_CALLEES = new Set(['it', 'test', 'describe', 'xit', 'fit', 'xtest', 'xdescribe', 'fdescribe', 'itIfEnv', 'describeIfEnv']);

function isFunction(node) {
  return node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression' || node.type === 'FunctionDeclaration';
}

function isNodeInside(root, node) {
  for (let current = node; current; current = current.parent) {
    if (current === root) return true;
  }
  return false;
}

function rootIdentifierName(node) {
  let current = node;
  while (current) {
    if (current.type === 'Identifier') return current.name;
    if (current.type === 'MemberExpression') {
      current = current.object;
      continue;
    }
    if (current.type === 'CallExpression') {
      current = current.callee;
      continue;
    }
    return null;
  }
  return null;
}

function isTestFactoryCall(node) {
  return node && node.type === 'CallExpression' && TEST_CALLEES.has(rootIdentifierName(node.callee));
}

function innermostFunction(node) {
  for (let current = node; current; current = current.parent) {
    if (isFunction(current)) return current;
  }
  return null;
}

function functionIsTestCallback(fn) {
  const parent = fn.parent;
  if (!parent || parent.type !== 'CallExpression') return false;
  if (!parent.arguments.includes(fn)) return false;
  return isTestFactoryCall(parent);
}

function containsProcessEnv(node) {
  if (!node || typeof node !== 'object') return false;
  if (node.type === 'MemberExpression') {
    const obj = node.object;
    if (
      obj &&
      obj.type === 'MemberExpression' &&
      !obj.computed &&
      obj.object.type === 'Identifier' &&
      obj.object.name === 'process' &&
      obj.property.type === 'Identifier' &&
      obj.property.name === 'env'
    ) {
      return true;
    }
  }
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const value = node[key];
    if (Array.isArray(value)) {
      if (value.some(containsProcessEnv)) return true;
    } else if (value && typeof value === 'object' && typeof value.type === 'string') {
      if (containsProcessEnv(value)) return true;
    }
  }
  return false;
}

function isMissingEnvCheck(node) {
  if (!node) return false;
  if (node.type === 'UnaryExpression' && node.operator === '!') {
    return containsProcessEnv(node.argument);
  }
  if (node.type === 'LogicalExpression') {
    return isMissingEnvCheck(node.left) || isMissingEnvCheck(node.right);
  }
  return false;
}

function missingEnvGuard(returnNode) {
  let current = returnNode.parent;
  while (current && !isFunction(current)) {
    if (current.type === 'IfStatement' && isNodeInside(current.consequent, returnNode) && isMissingEnvCheck(current.test)) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function kindForCallback(fn) {
  const name = rootIdentifierName(fn.parent.callee);
  if (name === 'describe' || name === 'xdescribe' || name === 'fdescribe' || name === 'describeIfEnv') return 'describe';
  return 'it';
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow returning from a test when an environment variable is missing (Jest records that as a pass)',
    },
    schema: [],
    messages: {
      silentSkip:
        'Returning from {{kind}}() when an environment variable is missing is recorded as a pass. Use {{helper}} from tests/helpers/env so the test is reported as skipped.',
    },
  },
  create(context) {
    return {
      ReturnStatement(node) {
        if (!missingEnvGuard(node)) return;
        const fn = innermostFunction(node);
        if (!fn || !functionIsTestCallback(fn)) return;
        const kind = kindForCallback(fn);
        context.report({
          node,
          messageId: 'silentSkip',
          data: {
            kind,
            helper: kind === 'describe' ? 'describeIfEnv' : 'itIfEnv',
          },
        });
      },
    };
  },
};
