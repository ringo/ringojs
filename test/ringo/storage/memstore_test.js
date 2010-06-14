var assert = require("assert");
include('./testconsts');
var {Store} = require('ringo/storage/memstore');
var store = new Store();
var personId, person, Person = store.defineEntity('Person');

exports.setUp = exports.tearDown = function () {
    for each (let instance in Person.all()) {
        instance.remove(); // Clean up.
    }
    assert.strictEqual(0, Person.all().length);
};

exports.testPersistCreation = function () {
    person = createTestPerson();
    person.save();
    personId = person._id;
    person = Person.get(personId);
    assertPerson();
    assert.strictEqual(FIRST_NAME_1, person.firstName);
    assert.strictEqual(LAST_NAME, person.lastName);
    assert.deepEqual(new Date(BIRTH_DATE_MILLIS), person.birthDate);
    assert.strictEqual(BIRTH_YEAR, person.birthYear);
    assert.strictEqual(VITAE_1, person.vitae);
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
    assert.strictEqual(FIRST_NAME_2, person.firstName);
    assert.strictEqual(LAST_NAME, person.lastName);
    assert.deepEqual(new Date(BIRTH_DATE_MILLIS), person.birthDate);
    assert.strictEqual(BIRTH_YEAR, person.birthYear);
    assert.strictEqual(VITAE_1, person.vitae);
};

exports.testPersistDeletion = function () {
    person = createTestPerson();
    person.save();
    person = Person.all()[0];
    assertPerson();
    personId = person._id;
    person.remove();
    person = Person.get(personId);
    assert.isNull(person);
    assert.strictEqual(0, Person.all().length);
};

exports.testBasicQuerying = function () {
    person = createTestPerson();
    person.save();
    person = createTestPerson();
    person.firstName = FIRST_NAME_2;
    person.vitae = VITAE_2;
    person.save();
    assert.isTrue(Person.all()[0] instanceof Storable &&
            Person.all()[0] instanceof Person);
    assert.strictEqual(2, Person.all().length);
    assert.strictEqual(LAST_NAME, Person.all()[0].lastName);
    var queriedPerson = Person.query().equals('firstName', FIRST_NAME_1).
            select()[0];
    assert.isTrue(queriedPerson instanceof Storable &&
            queriedPerson instanceof Person);
    assert.strictEqual(1, Person.query().equals('firstName', FIRST_NAME_1).select().
            length);
    assert.strictEqual(FIRST_NAME_1, Person.query().equals('firstName', FIRST_NAME_1).
            select('firstName')[0]);
    assert.strictEqual(2, Person.query().equals('lastName', LAST_NAME).select().
            length);
    assert.strictEqual(VITAE_2, Person.query().equals('lastName', LAST_NAME).
            equals('firstName', FIRST_NAME_2).select('vitae')[0]);
    testGreaterLessQuerying();
};

function testGreaterLessQuerying() {
    assert.strictEqual(2, Person.query().greater('birthYear', BIRTH_YEAR - 1).select().
            length);
    assert.strictEqual(0, Person.query().greater('birthYear', BIRTH_YEAR + 1).select().
            length);
    assert.strictEqual(2, Person.query().less('birthYear', BIRTH_YEAR + 1).select().
            length);
    assert.strictEqual(0, Person.query().less('birthYear', BIRTH_YEAR - 1).select().
            length);
    assert.strictEqual(2, Person.query().greaterEquals('birthYear', BIRTH_YEAR).
            select().length);
    assert.strictEqual(2, Person.query().greaterEquals('birthYear', BIRTH_YEAR - 1).
            select().length);
    assert.strictEqual(0, Person.query().greaterEquals('birthYear', BIRTH_YEAR + 1).
            select().length);
    assert.strictEqual(2, Person.query().lessEquals('birthYear', BIRTH_YEAR).select().
            length);
    assert.strictEqual(2, Person.query().lessEquals('birthYear', BIRTH_YEAR + 1).
            select().length);
    assert.strictEqual(0, Person.query().lessEquals('birthYear', BIRTH_YEAR - 1).
            select().length);
    assert.strictEqual(2, Person.query().greater('birthDate', new Date(
            BIRTH_DATE_MILLIS - 1)).select().length);
    assert.strictEqual(0, Person.query().greater('birthDate', new Date(
            BIRTH_DATE_MILLIS)).select().length);
    assert.strictEqual(2, Person.query().less('birthDate', new Date(BIRTH_DATE_MILLIS +
            1)).select().length);
    assert.strictEqual(0, Person.query().less('birthDate', new Date(BIRTH_DATE_MILLIS)
            ).select().length);
    assert.strictEqual(2, Person.query().greaterEquals('birthDate', new Date(
            BIRTH_DATE_MILLIS)).select().length);
    assert.strictEqual(2, Person.query().greaterEquals('birthDate', new Date(
            BIRTH_DATE_MILLIS - 1)).select().length);
    assert.strictEqual(0, Person.query().greaterEquals('birthDate', new Date(
            BIRTH_DATE_MILLIS + 1)).select().length);
    assert.strictEqual(2, Person.query().lessEquals('birthDate', new Date(
            BIRTH_DATE_MILLIS)).select().length);
    assert.strictEqual(2, Person.query().lessEquals('birthDate', new Date(
            BIRTH_DATE_MILLIS + 1)).select().length);
    assert.strictEqual(0, Person.query().lessEquals('birthDate', new Date(
            BIRTH_DATE_MILLIS - 1)).select().length);
    assert.strictEqual(LAST_NAME, Person.query().equals('lastName', LAST_NAME).
            greater('birthDate', new Date(BIRTH_DATE_MILLIS - 1)).
            less('birthYear', BIRTH_YEAR + 1).select('lastName')[0]);
}

function createTestPerson() {
    return new Person({firstName: FIRST_NAME_1, lastName: LAST_NAME,
            birthDate: new Date(BIRTH_DATE_MILLIS), birthYear: BIRTH_YEAR,
            vitae: VITAE_1});
}

function assertPerson() {
    assert.isNotNull(person);
    assert.isTrue(person instanceof Storable &&
            person instanceof Person);
}
