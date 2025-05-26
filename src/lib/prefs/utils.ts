/**
 * Generates a random alphanumeric ID, with a length of 12 characters.
 *
 * @returns {string} Randomly generated 12-character ID
 */
export function generateId(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 12; i++) {
        const random = Math.floor(Math.random() * characters.length);
        id += characters[random];
    }
    return id;
}
