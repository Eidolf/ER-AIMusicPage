export interface VideoItem {
    id: number;
    filename: string;
    url: string;
    media_type: string;
    related_to_id?: number;
    title?: string;
    genre?: string;
}

export interface Guest {
    id: number;
    email: string;
    name?: string;
    created_at: string;
    pin: string;
}
