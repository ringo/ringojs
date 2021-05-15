const assert = require("assert");
const {Semaphore} = require("ringo/concurrent");

exports.testSemaphore = () => {
    let semaphore = new Semaphore(1);
    semaphore.wait();
    spawn(() => {
        java.lang.Thread.sleep(50);
        semaphore.signal(2);
    });
    assert.isTrue(semaphore.tryWait(60, 2));
};
