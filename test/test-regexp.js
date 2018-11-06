module.exports = (app) => {
    app.get(/\S+\.html$/, () => {
        return "request an HTML file.";
    });
}