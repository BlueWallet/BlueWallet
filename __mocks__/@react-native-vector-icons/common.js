// Mock the entire common library so there are no native module loading errors
module.exports = {
  createIconSet: () => "icon"
}
