const assert = require("assert");
const {Semaphore} = require("ringo/concurrent");

exports.testResolve = () => {
    const semaphore = new Semaphore();
    let expected = false;
    spawn(() => {
        return new Promise(resolve => {
            java.lang.Thread.sleep(100);
            resolve(true);
        }).then(value => {
            expected = value;
            semaphore.signal();
        });
    });
    semaphore.tryWait(5000);
    assert.isTrue(expected);
};

if (require.main === module) {
    require("system").exit(require("test").run(module.id));
}
