/**
 * Fetch JSON from an API
 * @param url - The URL to fetch from
 * @param options - The options to pass to the fetch function
 * @returns The JSON response
 */
export async function fetchJson<T>(
    url: string,
    options?: RequestInit
): Promise<T> {
    const res = await fetch(url, options);

    if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Request failed: ${res.status} - ${errorBody}`);
    }

    return res.json();
}