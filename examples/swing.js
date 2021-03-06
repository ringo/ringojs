const {JFrame, JButton, ImageIcon, JLabel} = javax.swing;
const system = require('system');

const n = 0;

function main() {
    const frame = new JFrame("Swing Demo");
    const button = new JButton(new ImageIcon(module.resolve("img/ringo-drums.png")));
    button.addActionListener(function(e) {
        setInterval(function() {
            if (n++ > 200) system.exit();
            frame.setLocation(200 + random(), 200 + random());
        }, 5);
    });
    frame.add("Center", button);
    frame.add("South", new JLabel("Click Button for Visual Drumroll!"));
    frame.setSize(300, 300);
    frame.setLocation(200, 200);
    frame.setVisible(true);
}

function random() {
    return (Math.random() - 0.5) * 50;
}

if (require.main == module) {
    main();
}
