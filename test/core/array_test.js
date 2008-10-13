include("helma.unittest");
require("core.array");
var logging = require("helma.logging");
var log = logging.getLogger(__name__);

var testCase = new TestCase("core.array");


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


testCase.testAssertTrue = function() {
   // testing the test environment
   assertTrue(true);
   return;
};

testCase.testArrayIndexOf = function() {
   
   // test with empty array   
   assertEqual( empty.indexOf(string3), -1 );
   assertEqual( empty.indexOf(null), -1 );
   assertEqual( empty.indexOf(undefined), -1 );

   // test with strings
   assertEqual( arrayWithOneString.indexOf(string1), 0 );
   assertEqual( arrayWithTwoStrings.indexOf(string1), 0 );
   assertEqual( arrayWithFiveStrings.indexOf(string1), 0 );
   assertEqual( arrayWithFiveOneStrings.indexOf(string1), 0 );

   assertNotEqual( arrayWithTwoStrings.indexOf(string3), 2 );
   assertEqual( arrayWithTwoStrings.indexOf(string3), -1 );
   assertEqual( arrayWithFiveStrings.indexOf(string3), 2 );
   
   // test with objects
   assertEqual( arrayWithOneObject.indexOf(obj1), 0 );
   assertEqual( arrayWithTwoObjects.indexOf(obj1), 0 );
   assertEqual( arrayWithTwoObjects.indexOf(obj2), 1 );

   assertEqual( arrayWithFiveObjects.indexOf(obj4), 0 );
   assertEqual( arrayWithFiveObjects.indexOf(obj1), 0 );

   return;
};


testCase.testArrayLastIndexOf = function() {
   
   // test with empty array
   assertEqual( empty.lastIndexOf(string3), -1 );
   assertEqual( empty.lastIndexOf(null), -1 );
   assertEqual( empty.lastIndexOf(undefined), -1 );

   // test with strings
      assertEqual( arrayWithOneString.lastIndexOf(string1), 0 );
      assertEqual( arrayWithTwoStrings.lastIndexOf(string1), 0 );
      assertEqual( arrayWithFiveStrings.lastIndexOf(string1), 0 );
      assertEqual( arrayWithFiveOneStrings.lastIndexOf(string1), 4 );      


   assertNotEqual( arrayWithTwoStrings.lastIndexOf(string3), 2 );
   assertEqual( arrayWithTwoStrings.lastIndexOf(string3), -1 );
   assertEqual( arrayWithFiveStrings.lastIndexOf(string3), 2 );
   
   // test with objects
    assertEqual( arrayWithOneObject.lastIndexOf(obj1), 0 );
    assertEqual( arrayWithTwoObjects.lastIndexOf(obj1), 0 );
    assertEqual( arrayWithTwoObjects.lastIndexOf(obj2), 1 );


    assertEqual( arrayWithFiveObjects.lastIndexOf(obj4), 4 );
    assertEqual( arrayWithFiveObjects.lastIndexOf(obj1), 4 );

   return;
};


testCase.testArrayContains = function() {

   // Array.prototype.contains = Array.prototype.include;
   
   // test with empty array   
   assertFalse( empty.contains(string3) );
   assertFalse( empty.contains(null) );
   assertFalse( empty.contains(undefined) );

   // test with strings
   assertTrue( arrayWithOneString.contains(string1) );
   assertTrue( arrayWithTwoStrings.contains(string1) );
   assertTrue( arrayWithFiveStrings.contains(string1) );
   assertTrue( arrayWithFiveOneStrings.contains(string1) );

   assertFalse( arrayWithTwoStrings.contains(string3) );
   assertTrue( arrayWithFiveStrings.contains(string3) );
   
   // test with objects
   assertTrue( arrayWithOneObject.contains(obj1) );
   assertTrue( arrayWithTwoObjects.contains(obj1) );
   assertTrue( arrayWithTwoObjects.contains(obj2) );

   assertTrue( arrayWithFiveObjects.contains(obj4) );
   assertTrue( arrayWithFiveObjects.contains(obj1) );   

   return;
};


testCase.testArrayUnion = function() {

   // test with empty
   assertEqualArrays(
      Array.union(empty, empty), 
      []
   );
   assertEqualArrays(
      Array.union(empty, arrayWithTwoStrings), 
      ["one", "two"]
   );
   
   // test with strings
   assertEqualArrays(
      Array.union(arrayWithOneString, arrayWithOneString), 
      ["one"]
   );
   assertEqualArrays(
      Array.union(arrayWithOneString, arrayWithTwoStrings), 
      ["one", "two"]
   );
   assertEqualArrays(
      Array.union(arrayWithTwoStrings, arrayWithTwoStrings), 
      ["one", "two"]
   );
   assertEqualArrays(
      Array.union(arrayWithTwoStrings, arrayWithFiveStrings), 
      arrayWithFiveStrings
   );
   assertEqualArrays(
      Array.union(arrayWithFiveOneStrings, arrayWithFiveStrings), 
      arrayWithFiveStrings
   );
   assertEqualArrays(
      Array.union(arrayWithOneString, arrayWithTwoThreeStrings), 
      ["one", "two", "three"]
   );
   assertEqualArrays(
      Array.union(arrayWithTwoStrings, arrayWithTwoThreeStrings), 
      ["one", "two", "three"]
   );
   assertEqualArrays(
      Array.union(arrayWithTwoThreeStrings, arrayWithOneString), 
      ["two", "three", "one"]
   );
   assertEqualArrays(
      Array.union(arrayWithTwoThreeStrings, arrayWithTwoStrings), 
      ["two", "three", "one"]
   );
   
   // test with objects
   assertEqualArrays(
      Array.union(arrayWithOneObject, arrayWithOneObject), 
      arrayWithOneObject
   );

   assertEqualArrays(
      Array.union(arrayWithTwoObjects, arrayWithTwoObjects),
      arrayWithTwoObjects
   );
   assertEqualArrays(
      Array.union(arrayWithFiveObjects, empty),
      [obj1, obj2, obj3] // breaks
   );

   return;
};


testCase.testArrayIntersection = function() {

   // test with empty
   assertEqualArrays(
      Array.intersection(empty, empty), 
      []
   );
   assertEqualArrays(
      Array.intersection(empty, arrayWithTwoStrings), 
      []
   );
   
   // test with strings
   assertEqualArrays(
      Array.intersection(arrayWithOneString, arrayWithOneString), 
      ["one"]
   );
   assertEqualArrays(
      Array.intersection(arrayWithOneString, arrayWithTwoStrings), 
      ["one"]
   );
   assertEqualArrays(
      Array.intersection(arrayWithTwoStrings, arrayWithTwoStrings), 
      ["one", "two"]
   );
   assertEqualArrays(
      Array.intersection(arrayWithTwoStrings, arrayWithFiveStrings), 
      arrayWithTwoStrings
   );
   assertEqualArrays(
      Array.intersection(arrayWithFiveOneStrings, arrayWithFiveStrings), 
      ["one"]
   );
   assertEqualArrays(
      Array.intersection(arrayWithOneString, arrayWithTwoThreeStrings), 
      []
   );
   assertEqualArrays(
      Array.intersection(arrayWithTwoStrings, arrayWithTwoThreeStrings), 
      ["two"]
   );
   assertEqualArrays(
      Array.intersection(arrayWithTwoThreeStrings, arrayWithOneString), 
      []
   );
   assertEqualArrays(
      Array.intersection(arrayWithTwoThreeStrings, arrayWithTwoStrings), 
      ["two"]
   );
   
   // test with objects
   assertEqualArrays(
      Array.intersection(arrayWithOneObject, arrayWithOneObject), 
      arrayWithOneObject
   );

   assertEqualArrays(
      Array.intersection(arrayWithTwoObjects, arrayWithTwoObjects),
      arrayWithTwoObjects
   );
   assertEqualArrays(
      Array.intersection(arrayWithFiveObjects, arrayWithTwoObjects),
      [obj1, obj2]
   );

   assertEqualArrays(
      Array.intersection(arrayWithFiveObjects, empty), 
      []
   );
   
   return;
};

