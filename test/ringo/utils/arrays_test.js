const assert = require("assert");
const arrays = require("ringo/utils/arrays");

// test data
const empty = [];

// arrays with strings
const arrayWithOneString = ["one"];
const arrayWithTwoStrings = ["one", "two"];
const arrayWithFiveStrings = ["one", "two", "three", "four", "five"];
const arrayWithFiveOneStrings = ["one", "one", "one", "one", "one"];
const arrayWithTwoThreeStrings = ["two", "three"];
const string1 = "one";
const string3 = "three";

// arrays with objects
const obj1 = { test : "obj" };
const obj2 = { test : "obj" }; // looks similar to obj1, but in fact is a different object
const obj3 = { test : "obj3" };
const obj4 = obj1; // obj4 is the same as obj1

const arrayWithOneObject = [obj1];
const arrayWithTwoObjects = [obj1, obj2];
const arrayWithFiveObjects = [obj1, obj2, obj3, obj4, obj1];


exports.testIndexOf = function() {

   // test with empty array
   assert.strictEqual( empty.indexOf(string3), -1 );
   assert.strictEqual( empty.indexOf(null), -1 );
   assert.strictEqual( empty.indexOf(undefined), -1 );

   // test with strings
   assert.strictEqual( arrayWithOneString.indexOf(string1), 0 );
   assert.strictEqual( arrayWithTwoStrings.indexOf(string1), 0 );
   assert.strictEqual( arrayWithFiveStrings.indexOf(string1), 0 );
   assert.strictEqual( arrayWithFiveOneStrings.indexOf(string1), 0 );

   assert.notStrictEqual( arrayWithTwoStrings.indexOf(string3), 2 );
   assert.strictEqual( arrayWithTwoStrings.indexOf(string3), -1 );
   assert.strictEqual( arrayWithFiveStrings.indexOf(string3), 2 );

   // test with objects
   assert.strictEqual( arrayWithOneObject.indexOf(obj1), 0 );
   assert.strictEqual( arrayWithTwoObjects.indexOf(obj1), 0 );
   assert.strictEqual( arrayWithTwoObjects.indexOf(obj2), 1 );

   assert.strictEqual( arrayWithFiveObjects.indexOf(obj4), 0 );
   assert.strictEqual( arrayWithFiveObjects.indexOf(obj1), 0 );
};


exports.testLastIndexOf = function() {

   // test with empty array
   assert.strictEqual( empty.lastIndexOf(string3), -1 );
   assert.strictEqual( empty.lastIndexOf(null), -1 );
   assert.strictEqual( empty.lastIndexOf(undefined), -1 );

   // test with strings
   assert.strictEqual( arrayWithOneString.lastIndexOf(string1), 0 );
   assert.strictEqual( arrayWithTwoStrings.lastIndexOf(string1), 0 );
   assert.strictEqual( arrayWithFiveStrings.lastIndexOf(string1), 0 );
   assert.strictEqual( arrayWithFiveOneStrings.lastIndexOf(string1), 4 );


   assert.notStrictEqual( arrayWithTwoStrings.lastIndexOf(string3), 2 );
   assert.strictEqual( arrayWithTwoStrings.lastIndexOf(string3), -1 );
   assert.strictEqual( arrayWithFiveStrings.lastIndexOf(string3), 2 );

   // test with objects
   assert.strictEqual( arrayWithOneObject.lastIndexOf(obj1), 0 );
   assert.strictEqual( arrayWithTwoObjects.lastIndexOf(obj1), 0 );
   assert.strictEqual( arrayWithTwoObjects.lastIndexOf(obj2), 1 );


   assert.strictEqual( arrayWithFiveObjects.lastIndexOf(obj4), 4 );
   assert.strictEqual( arrayWithFiveObjects.lastIndexOf(obj1), 4 );
};


exports.testContains = function() {

   // Array.prototype.contains = Array.prototype.include;

   // test with empty array
   assert.isFalse( arrays.contains(empty, string3) );
   assert.isFalse( arrays.contains(empty, null) );
   assert.isFalse( arrays.contains(empty, undefined) );

   // test with strings
   assert.isTrue( arrays.contains(arrayWithOneString, string1) );
   assert.isTrue( arrays.contains(arrayWithTwoStrings, string1) );
   assert.isTrue( arrays.contains(arrayWithFiveStrings, string1) );
   assert.isTrue( arrays.contains(arrayWithFiveOneStrings, string1) );

   assert.isFalse( arrays.contains(arrayWithTwoStrings, string3) );
   assert.isTrue( arrays.contains(arrayWithFiveStrings, string3) );

   // test with objects
   assert.isTrue( arrays.contains(arrayWithOneObject, obj1) );
   assert.isTrue( arrays.contains(arrayWithTwoObjects, obj1) );
   assert.isTrue( arrays.contains(arrayWithTwoObjects, obj2) );

   assert.isTrue( arrays.contains(arrayWithFiveObjects, obj4) );
   assert.isTrue( arrays.contains(arrayWithFiveObjects, obj1) );
};


exports.testUnion = function() {

   // test with empty
   assert.deepEqual(
      arrays.union(empty, empty),
      []
   );
   assert.deepEqual(
      arrays.union(empty, arrayWithTwoStrings),
      ["one", "two"]
   );

   // test with strings
   assert.deepEqual(
      arrays.union(arrayWithOneString, arrayWithOneString),
      ["one"]
   );
   assert.deepEqual(
      arrays.union(arrayWithOneString, arrayWithTwoStrings),
      ["one", "two"]
   );
   assert.deepEqual(
      arrays.union(arrayWithTwoStrings, arrayWithTwoStrings),
      ["one", "two"]
   );
   assert.deepEqual(
      arrays.union(arrayWithTwoStrings, arrayWithFiveStrings),
      arrayWithFiveStrings
   );
   assert.deepEqual(
      arrays.union(arrayWithFiveOneStrings, arrayWithFiveStrings),
      arrayWithFiveStrings
   );
   assert.deepEqual(
      arrays.union(arrayWithOneString, arrayWithTwoThreeStrings),
      ["one", "two", "three"]
   );
   assert.deepEqual(
      arrays.union(arrayWithTwoStrings, arrayWithTwoThreeStrings),
      ["one", "two", "three"]
   );
   assert.deepEqual(
      arrays.union(arrayWithTwoThreeStrings, arrayWithOneString),
      ["two", "three", "one"]
   );
   assert.deepEqual(
      arrays.union(arrayWithTwoThreeStrings, arrayWithTwoStrings),
      ["two", "three", "one"]
   );

   // test with objects
   assert.deepEqual(
      arrays.union(arrayWithOneObject, arrayWithOneObject),
      arrayWithOneObject
   );

   assert.deepEqual(
      arrays.union(arrayWithTwoObjects, arrayWithTwoObjects),
      arrayWithTwoObjects
   );
   assert.deepEqual(
      arrays.union(arrayWithFiveObjects, empty),
      [obj1, obj2, obj3]
   );
};


exports.testIntersection = function() {

   // test with empty
   assert.deepEqual(
      arrays.intersection(empty, empty),
      []
   );
   assert.deepEqual(
      arrays.intersection(empty, arrayWithTwoStrings),
      []
   );

   // test with strings
   assert.deepEqual(
      arrays.intersection(arrayWithOneString, arrayWithOneString),
      ["one"]
   );
   assert.deepEqual(
      arrays.intersection(arrayWithOneString, arrayWithTwoStrings),
      ["one"]
   );
   assert.deepEqual(
      arrays.intersection(arrayWithTwoStrings, arrayWithTwoStrings),
      ["one", "two"]
   );
   assert.deepEqual(
      arrays.intersection(arrayWithTwoStrings, arrayWithFiveStrings),
      arrayWithTwoStrings
   );
   assert.deepEqual(
      arrays.intersection(arrayWithFiveOneStrings, arrayWithFiveStrings),
      ["one"]
   );
   assert.deepEqual(
      arrays.intersection(arrayWithOneString, arrayWithTwoThreeStrings),
      []
   );
   assert.deepEqual(
      arrays.intersection(arrayWithTwoStrings, arrayWithTwoThreeStrings),
      ["two"]
   );
   assert.deepEqual(
      arrays.intersection(arrayWithTwoThreeStrings, arrayWithOneString),
      []
   );
   assert.deepEqual(
      arrays.intersection(arrayWithTwoThreeStrings, arrayWithTwoStrings),
      ["two"]
   );

   // test with objects
   assert.deepEqual(
      arrays.intersection(arrayWithOneObject, arrayWithOneObject),
      arrayWithOneObject
   );

   assert.deepEqual(
      arrays.intersection(arrayWithTwoObjects, arrayWithTwoObjects),
      arrayWithTwoObjects
   );
   assert.deepEqual(
      arrays.intersection(arrayWithFiveObjects, arrayWithTwoObjects),
      [obj1, obj2]
   );

   assert.deepEqual(
      arrays.intersection(arrayWithFiveObjects, empty),
      []
   );
};

if (require.main === module) {
   require('system').exit(require("test").run(module.id));
}
