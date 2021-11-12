module.exports = class ErrorWithDetail extends Error {
    constructor(message, error, data) {
        super(message);
        this.detail = typeof error === 'string' ? error : `${error.message || error || ''}`
        this.data = data
    }
}