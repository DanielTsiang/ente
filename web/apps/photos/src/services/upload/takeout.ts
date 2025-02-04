/* eslint-disable @typescript-eslint/dot-notation */
/** @file Dealing with the JSON metadata sidecar files */

import { ensureElectron } from "@/base/electron";
import { nameAndExtension } from "@/base/file-name";
import log from "@/base/log";
import { type Location } from "@/base/types";
import { readStream } from "@/gallery/utils/native-stream";
import type { UploadItem } from "@/new/photos/services/upload/types";
import { maybeParseInt } from "@/utils/parse";

/**
 * The data we read from the JSON metadata sidecar files.
 *
 * Originally these were used to read the JSON metadata sidecar files present in
 * a Google Takeout. However, during our own export, we also write out files
 * with a similar structure.
 */
export interface ParsedMetadataJSON {
    creationTime?: number;
    modificationTime?: number;
    location?: Location;
    description?: string;
}

interface FileNameComponents {
    originalName: string;
    numberedSuffix: string;
    extension: string;
    isEditedFile: boolean;
}

const MAX_FILE_NAME_LENGTH_GOOGLE_EXPORT = 46;
const EDITED_FILE_SUFFIX = "-edited";
const METADATA_SUFFIX = ".supplemental-metadata";

/**
 * Derive a key for the given {@link jsonFileName} that should be used to index
 * into the {@link ParsedMetadataJSON} JSON map.
 *
 * @param collectionID The collection to which we're uploading.
 *
 * @param jsonFileName The file name for the JSON file.
 *
 * @returns A key suitable for indexing into the metadata JSON map.
 */
export const metadataJSONMapKeyForJSON = (
    collectionID: number,
    jsonFileName: string,
) => `${collectionID}-${jsonFileName.slice(0, -1 * ".json".length)}`;

/**
 * Return the matching entry, if any, from {@link parsedMetadataJSONMap} for the
 * {@link fileName} and {@link collectionID} combination.
 *
 * This is the sibling of {@link metadataJSONMapKeyForJSON}, except for deriving
 * the filename key we might have to try a bunch of different variations, so
 * this does not return a single key but instead tries the combinations until it
 * finds an entry in the map, and returns the found entry instead of the key.
 */
export const matchTakeoutMetadata = (
    fileName: string,
    collectionID: number,
    parsedMetadataJSONMap: Map<string, ParsedMetadataJSON>,
) => {
    const components = getFileNameComponents(fileName);
    let key = getMetadataJSONMapKeyForFile(collectionID, components);
    let takeoutMetadata = parsedMetadataJSONMap.get(key);

    if (!takeoutMetadata) {
        key = getClippedMetadataJSONMapKeyForFile(collectionID, components);
        takeoutMetadata = parsedMetadataJSONMap.get(key);
    }

    if (!takeoutMetadata) {
        key = getSupplementaryMetadataJSONMapKeyForFile(
            collectionID,
            components,
        );
        takeoutMetadata = parsedMetadataJSONMap.get(key);
    }

    return takeoutMetadata;
};

/*
    Get the components of the file name. Also removes the "-edited" suffix, if present, so that the edited file can be
    associated to the original file's metadataJSON file as edited files don't have their own metadata files.
*/
const getFileNameComponents = (fileName: string): FileNameComponents => {
    let [name, extension] = nameAndExtension(fileName);
    if (extension) {
        extension = "." + extension;
    }
    let numberedSuffix: string = null;

    const endsWithNumberedSuffixWithBrackets = /\(\d+\)$/.exec(name);
    if (endsWithNumberedSuffixWithBrackets) {
        name = name.slice(0, -1 * endsWithNumberedSuffixWithBrackets[0].length);
        numberedSuffix = endsWithNumberedSuffixWithBrackets[0];
    }
    const isEditedFile = name.endsWith(EDITED_FILE_SUFFIX);
    if (isEditedFile) {
        name = name.slice(0, -1 * EDITED_FILE_SUFFIX.length);
    }

    return {
        originalName: name,
        numberedSuffix,
        extension,
        isEditedFile,
    };
};

const getMetadataJSONMapKeyForFile = (
    collectionID: number,
    components: FileNameComponents,
) => {
    const baseFileName = `${components.originalName}${components.extension}`;
    return `${collectionID}-${baseFileName}${components.numberedSuffix ?? ""}`;
};

// if the file name is greater than MAX_FILE_NAME_LENGTH_GOOGLE_EXPORT(46) , then google photos clips the file name
// so we need to use the clipped file name to get the metadataJSON file
const getClippedMetadataJSONMapKeyForFile = (
    collectionID: number,
    components: FileNameComponents,
) => {
    const baseFileName = `${components.originalName}${components.extension}`;
    return `${collectionID}-${baseFileName.slice(0, MAX_FILE_NAME_LENGTH_GOOGLE_EXPORT)}${components.numberedSuffix ?? ""}`;
};

// newer Takeout exports are attaching a ".supplemental-metadata" suffix to the file name of the metadataJSON file,
// and then clipping the file name if it's too long (ending up with filenames like
// "very_long_file_name.jpg.supple.json")
const getSupplementaryMetadataJSONMapKeyForFile = (
    collectionID: number,
    components: FileNameComponents,
) => {
    const baseFileName = `${components.originalName}${components.extension}${METADATA_SUFFIX}`;
    return `${collectionID}-${baseFileName.slice(0, MAX_FILE_NAME_LENGTH_GOOGLE_EXPORT)}${components.numberedSuffix ?? ""}`;
};

/**
 * Try to parse the contents of a metadata JSON file from a Google Takeout.
 */
export const tryParseTakeoutMetadataJSON = async (
    uploadItem: UploadItem,
): Promise<ParsedMetadataJSON | undefined> => {
    try {
        return parseMetadataJSONText(await uploadItemText(uploadItem));
    } catch (e) {
        log.error("Failed to parse takeout metadata JSON", e);
        return undefined;
    }
};

const uploadItemText = async (uploadItem: UploadItem) => {
    if (uploadItem instanceof File) {
        return await uploadItem.text();
    } else if (typeof uploadItem == "string") {
        return await ensureElectron().fs.readTextFile(uploadItem);
    } else if (Array.isArray(uploadItem)) {
        const { response } = await readStream(ensureElectron(), uploadItem);
        return await response.text();
    } else {
        return await uploadItem.file.text();
    }
};

const parseMetadataJSONText = (text: string) => {
    const metadataJSON: object = JSON.parse(text);
    if (!metadataJSON) {
        return undefined;
    }

    const parsedMetadataJSON: ParsedMetadataJSON = {};

    parsedMetadataJSON.creationTime =
        parseGTTimestamp(metadataJSON["photoTakenTime"]) ??
        parseGTTimestamp(metadataJSON["creationTime"]);

    parsedMetadataJSON.modificationTime = parseGTTimestamp(
        metadataJSON["modificationTime"],
    );

    parsedMetadataJSON.location =
        parseGTLocation(metadataJSON["geoData"]) ??
        parseGTLocation(metadataJSON["geoDataExif"]);

    parsedMetadataJSON.description = parseGTNonEmptyString(
        metadataJSON["description"],
    );

    return parsedMetadataJSON;
};

/**
 * Parse a nullish epoch seconds timestamp string from a field in a Google
 * Takeout JSON, converting it into epoch microseconds if it is found.
 *
 * Note that the metadata provided by Google does not include the time zone
 * where the photo was taken, it only has an epoch seconds value. There is an
 * associated formatted date value (e.g. "17 Feb 2021, 03:22:16 UTC") but that
 * seems to be in UTC and doesn't have the time zone either.
 */
const parseGTTimestamp = (o: unknown): number | undefined => {
    if (
        o &&
        typeof o == "object" &&
        "timestamp" in o &&
        typeof o.timestamp == "string"
    ) {
        const timestamp = maybeParseInt(o.timestamp);
        if (timestamp) return timestamp * 1e6;
    }
    return undefined;
};

/**
 * Parse a (latitude, longitude) location pair field in a Google Takeout JSON.
 *
 * Apparently Google puts in (0, 0) to indicate missing data, so this function
 * only returns a parsed result if both components are present and non-zero.
 */
const parseGTLocation = (o: unknown): Location | undefined => {
    if (
        o &&
        typeof o == "object" &&
        "latitude" in o &&
        typeof o.latitude == "number" &&
        "longitude" in o &&
        typeof o.longitude == "number"
    ) {
        const { latitude, longitude } = o;
        if (latitude !== 0 || longitude !== 0) return { latitude, longitude };
    }
    return undefined;
};

/**
 * Parse a string from a field in a Google Takeout JSON, treating empty strings
 * as undefined.
 */
const parseGTNonEmptyString = (o: unknown): string | undefined =>
    o && typeof o == "string" ? o : undefined;
