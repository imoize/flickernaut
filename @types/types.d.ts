export interface Editor {
    id: number;
    name: string;
    enable?: boolean;
    native?: string[];
    flatpak?: string[];
    arguments?: string[];
    supports_files?: boolean;
}

export interface ValidationResult {
    isValid: boolean;
    isDuplicate: boolean;
    isEmpty: boolean;
}
