module.exports = function(emResourceFactory) {
    return emResourceFactory({
        forAccount: {
            default: 'login_tokens',
            get: false,
            put: false,
            post: true,
            query: true,
            delete: true
        }
    });
};
