var assert = require("assert");
require("core/array");

// test data
var empty = [];

// arrays with strings
var arrayWithOneString = ["one"];
var arrayWithTwoStrings = ["one", "two"];
var arrayWithFiveStrings = ["one", "two", "three", "four", "five"];
var arrayWithFiveOneStrings = ["one", "one", "one", "one", "one"];
var arrayWithTwoThreeStrings = ["two", "three"];
var string1 = "one";
var string3 = "three";

// arrays with objects
var obj1 = { test : "obj" };
var obj2 = { test : "obj" }; // looks similar to obj1, but in fact is a different object
var obj3 = { test : "obj3" };
var obj4 = obj1; // obj4 is the same as obj1

var arrayWithOneObject = [obj1];
var arrayWithTwoObjects = [obj1, obj2];
var arrayWithTwoThreeObjects = [obj2, obj3];
var arrayWithFiveObjects = [obj1, obj2, obj3, obj4, obj1];


exports.testAssertTrue = function() {
   // testing the test environment
   assert.isTrue(true);
   return;
};

exports.testArrayIndexOf = function() {
   
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

   return;
};


exports.testArrayLastIndexOf = function() {
   
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

   return;
};


exports.testArrayContains = function() {

   // Array.prototype.contains = Array.prototype.include;
   
   // test with empty array   
   assert.isFalse( empty.contains(string3) );
   assert.isFalse( empty.contains(null) );
   assert.isFalse( empty.contains(undefined) );

   // test with strings
   assert.isTrue( arrayWithOneString.contains(string1) );
   assert.isTrue( arrayWithTwoStrings.contains(string1) );
   assert.isTrue( arrayWithFiveStrings.contains(string1) );
   assert.isTrue( arrayWithFiveOneStrings.contains(string1) );

   assert.isFalse( arrayWithTwoStrings.contains(string3) );
   assert.isTrue( arrayWithFiveStrings.contains(string3) );
   
   // test with objects
   assert.isTrue( arrayWithOneObject.contains(obj1) );
   assert.isTrue( arrayWithTwoObjects.contains(obj1) );
   assert.isTrue( arrayWithTwoObjects.contains(obj2) );

   assert.isTrue( arrayWithFiveObjects.contains(obj4) );
   assert.isTrue( arrayWithFiveObjects.contains(obj1) );   

   return;
};


exports.testArrayUnion = function() {

   // test with empty
   assert.deepEqual(
      Array.union(empty, empty), 
      []
   );
   assert.deepEqual(
      Array.union(empty, arrayWithTwoStrings), 
      ["one", "two"]
   );
   
   // test with strings
   assert.deepEqual(
      Array.union(arrayWithOneString, arrayWithOneString), 
      ["one"]
   );
   assert.deepEqual(
      Array.union(arrayWithOneString, arrayWithTwoStrings), 
      ["one", "two"]
   );
   assert.deepEqual(
      Array.union(arrayWithTwoStrings, arrayWithTwoStrings), 
      ["one", "two"]
   );
   assert.deepEqual(
      Array.union(arrayWithTwoStrings, arrayWithFiveStrings), 
      arrayWithFiveStrings
   );
   assert.deepEqual(
      Array.union(arrayWithFiveOneStrings, arrayWithFiveStrings), 
      arrayWithFiveStrings
   );
   assert.deepEqual(
      Array.union(arrayWithOneString, arrayWithTwoThreeStrings), 
      ["one", "two", "three"]
   );
   assert.deepEqual(
      Array.union(arrayWithTwoStrings, arrayWithTwoThreeStrings), 
      ["one", "two", "three"]
   );
   assert.deepEqual(
      Array.union(arrayWithTwoThreeStrings, arrayWithOneString), 
      ["two", "three", "one"]
   );
   assert.deepEqual(
      Array.union(arrayWithTwoThreeStrings, arrayWithTwoStrings), 
      ["two", "three", "one"]
   );
   
   // test with objects
   assert.deepEqual(
      Array.union(arrayWithOneObject, arrayWithOneObject), 
      arrayWithOneObject
   );

   assert.deepEqual(
      Array.union(arrayWithTwoObjects, arrayWithTwoObjects),
      arrayWithTwoObjects
   );
   assert.deepEqual(
      Array.union(arrayWithFiveObjects, empty),
      [obj1, obj2, obj3]
   );

   return;
};


exports.testArrayIntersection = function() {

   // test with empty
   assert.deepEqual(
      Array.intersection(empty, empty), 
      []
   );
   assert.deepEqual(
      Array.intersection(empty, arrayWithTwoStrings), 
      []
   );
   
   // test with strings
   assert.deepEqual(
      Array.intersection(arrayWithOneString, arrayWithOneString), 
      ["one"]
   );
   assert.deepEqual(
      Array.intersection(arrayWithOneString, arrayWithTwoStrings), 
      ["one"]
   );
   assert.deepEqual(
      Array.intersection(arrayWithTwoStrings, arrayWithTwoStrings), 
      ["one", "two"]
   );
   assert.deepEqual(
      Array.intersection(arrayWithTwoStrings, arrayWithFiveStrings), 
      arrayWithTwoStrings
   );
   assert.deepEqual(
      Array.intersection(arrayWithFiveOneStrings, arrayWithFiveStrings), 
      ["one"]
   );
   assert.deepEqual(
      Array.intersection(arrayWithOneString, arrayWithTwoThreeStrings), 
      []
   );
   assert.deepEqual(
      Array.intersection(arrayWithTwoStrings, arrayWithTwoThreeStrings), 
      ["two"]
   );
   assert.deepEqual(
      Array.intersection(arrayWithTwoThreeStrings, arrayWithOneString), 
      []
   );
   assert.deepEqual(
      Array.intersection(arrayWithTwoThreeStrings, arrayWithTwoStrings), 
      ["two"]
   );
   
   // test with objects
   assert.deepEqual(
      Array.intersection(arrayWithOneObject, arrayWithOneObject), 
      arrayWithOneObject
   );

   assert.deepEqual(
      Array.intersection(arrayWithTwoObjects, arrayWithTwoObjects),
      arrayWithTwoObjects
   );
   assert.deepEqual(
      Array.intersection(arrayWithFiveObjects, arrayWithTwoObjects),
      [obj1, obj2]
   );

   assert.deepEqual(
      Array.intersection(arrayWithFiveObjects, empty), 
      []
   );
   
   return;
};

