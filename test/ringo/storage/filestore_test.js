include('ringo/unittest');
include('./testconsts');
var fs = require('fs');
var {Store} = require('ringo/storage/filestore');
var dbPath = fs.join(system.prefix, 'test', 'testdb');
var store = new Store(dbPath);
var personId, person, Person = store.defineEntity('Person');

exports.setUp = exports.tearDown = function () {
    if (fs.isDirectory(dbPath)) {
        fs.removeTree(dbPath); // Clean up.
    }
    assertFalse(fs.isDirectory(dbPath));
};

exports.testPersistCreation = function () {
    person = createTestPerson();
    person.save();
    personId = person._id;
    person = Person.get(personId);
    assertPerson();
    assertEqual(FIRST_NAME_1, person.firstName);
    assertEqual(LAST_NAME, person.lastName);
    assertEqual(new Date(BIRTH_DATE_MILLIS), person.birthDate);
    assertEqual(BIRTH_YEAR, person.birthYear);
    assertEqual(VITAE_1, person.vitae);
};

exports.testPersistUpdating = function () {
    person = createTestPerson();
    person.save();
    person = Person.all()[0];
    assertPerson();
    personId = person._id;
    person.firstName = FIRST_NAME_2;
    person.save();
    person = Person.get(personId);
    assertPerson();
    assertEqual(FIRST_NAME_2, person.firstName);
    assertEqual(LAST_NAME, person.lastName);
    assertEqual(new Date(BIRTH_DATE_MILLIS), person.birthDate);
    assertEqual(BIRTH_YEAR, person.birthYear);
    assertEqual(VITAE_1, person.vitae);
};

exports.testPersistDeletion = function () {
    person = createTestPerson();
    person.save();
    person = Person.all()[0];
    assertPerson();
    personId = person._id;
    person.remove();
    person = Person.get(personId);
    assertNull(person);
    assertEqual(0, Person.all().length);
};

exports.testBasicQuerying = function () {
    person = createTestPerson();
    person.save();
    person = createTestPerson();
    person.firstName = FIRST_NAME_2;
    person.vitae = VITAE_2;
    person.save();
    assertTrue(Person.all()[0] instanceof Storable &&
            Person.all()[0] instanceof Person);
    assertEqual(2, Person.all().length);
    assertEqual(LAST_NAME, Person.all()[0].lastName);
    var queriedPerson = Person.query().equals('firstName', FIRST_NAME_1).
            select()[0];
    assertTrue(queriedPerson instanceof Storable &&
            queriedPerson instanceof Person);
    assertEqual(1, Person.query().equals('firstName', FIRST_NAME_1).select().
            length);
    assertEqual(FIRST_NAME_1, Person.query().equals('firstName', FIRST_NAME_1).
            select('firstName')[0]);
    assertEqual(2, Person.query().equals('lastName', LAST_NAME).select().
            length);
    assertEqual(VITAE_2, Person.query().equals('lastName', LAST_NAME).
            equals('firstName', FIRST_NAME_2).select('vitae')[0]);
    testGreaterLessQuerying();
};

function testGreaterLessQuerying() {
    assertEqual(2, Person.query().greater('birthYear', BIRTH_YEAR - 1).select().
            length);
    assertEqual(0, Person.query().greater('birthYear', BIRTH_YEAR + 1).select().
            length);
    assertEqual(2, Person.query().less('birthYear', BIRTH_YEAR + 1).select().
            length);
    assertEqual(0, Person.query().less('birthYear', BIRTH_YEAR - 1).select().
            length);
    assertEqual(2, Person.query().greaterEquals('birthYear', BIRTH_YEAR).
            select().length);
    assertEqual(2, Person.query().greaterEquals('birthYear', BIRTH_YEAR - 1).
            select().length);
    assertEqual(0, Person.query().greaterEquals('birthYear', BIRTH_YEAR + 1).
            select().length);
    assertEqual(2, Person.query().lessEquals('birthYear', BIRTH_YEAR).select().
            length);
    assertEqual(2, Person.query().lessEquals('birthYear', BIRTH_YEAR + 1).
            select().length);
    assertEqual(0, Person.query().lessEquals('birthYear', BIRTH_YEAR - 1).
            select().length);
    assertEqual(2, Person.query().greater('birthDate', new Date(
            BIRTH_DATE_MILLIS - 1)).select().length);
    assertEqual(0, Person.query().greater('birthDate', new Date(
            BIRTH_DATE_MILLIS)).select().length);
    assertEqual(2, Person.query().less('birthDate', new Date(BIRTH_DATE_MILLIS +
            1)).select().length);
    assertEqual(0, Person.query().less('birthDate', new Date(BIRTH_DATE_MILLIS)
            ).select().length);
    assertEqual(2, Person.query().greaterEquals('birthDate', new Date(
            BIRTH_DATE_MILLIS)).select().length);
    assertEqual(2, Person.query().greaterEquals('birthDate', new Date(
            BIRTH_DATE_MILLIS - 1)).select().length);
    assertEqual(0, Person.query().greaterEquals('birthDate', new Date(
            BIRTH_DATE_MILLIS + 1)).select().length);
    assertEqual(2, Person.query().lessEquals('birthDate', new Date(
            BIRTH_DATE_MILLIS)).select().length);
    assertEqual(2, Person.query().lessEquals('birthDate', new Date(
            BIRTH_DATE_MILLIS + 1)).select().length);
    assertEqual(0, Person.query().lessEquals('birthDate', new Date(
            BIRTH_DATE_MILLIS - 1)).select().length);
    assertEqual(LAST_NAME, Person.query().equals('lastName', LAST_NAME).
            greater('birthDate', new Date(BIRTH_DATE_MILLIS - 1)).
            less('birthYear', BIRTH_YEAR + 1).select('lastName')[0]);
}

function createTestPerson() {
    return new Person({firstName: FIRST_NAME_1, lastName: LAST_NAME,
            birthDate: new Date(BIRTH_DATE_MILLIS), birthYear: BIRTH_YEAR,
            vitae: VITAE_1});
}

function assertPerson() {
    assertNotNull(person);
    assertTrue(person instanceof Storable &&
            person instanceof Person);
}
