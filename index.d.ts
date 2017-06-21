// Type definitions for Jamy 0.1.0
// Project: https://github.com/TinyMan/node-jamy
// Definitions by: TinyMan https://github.com/TinyMan

export = Jamy;

import * as EventEmitter from "events";
import { Readable, PassThrough } from "stream";

/**
 * Jamy is an audio player designed to stream MSE compatible files when possible.
 * Note that standart stream / non-mse compatible files will not be seekable.
 * Only MSE compatible WebM files allow seekability for now.
 */
declare class Jamy extends EventEmitter {
	/**
	 * True if the stream is seekable
	 */
	public readonly seekable: boolean;
	/**
	 * The output stream
	 */
	public readonly stream: PassThrough;
	/**
	 * The current time of the presentation, in seconds
	 */
	public readonly currentTime: number;
	/**
	 * True if Jamy is playing something
	 */
	public readonly playing: boolean;
	/**
	* Playback options for the transcoder
	*/
	public playbackOptions: Jamy.PlaybackOptions;

	constructor(options?: Jamy.PlaybackOptions);

	/**
	 * Plays a media
	 * @param {MediaInfos} infos Describes the media source
	 */
	public play(infos: Jamy.MediaInfos): void;
	/**
	 * Stops the playback and kill transcoder
	 */
	public stop(): void;
	/**
	 * Pauses the playback
	 */
	public pause(): void;
	/**
	 * Resumes the playback
	 */
	public resume(): void;
	/**
	 * Seeks the given time in seconds
	 * If the media is not seekable, does nothing but emit and error
	 * @param {number} time Timecode in seconds. If negative, timecode will be substracted from the end
	 */
	public seek(time: number): void;
	/**
	 * Check if a MIME type is supported
	 */
	public typeSupported(mime: string): boolean;

}

/*~ If you want to expose types from your module as well, you can
 *~ place them in this block.
 */
declare namespace Jamy {
	export interface PlaybackOptions {
		bitDepth: number,
		frequency: number,
		format: string,
		channels: number,
		inputOptions: string[],
		outputOptions: string[]
	}
	export interface MediaInfos {
		url?: string,
		index?: string | Range,
		init?: string | Range,
		type?: string,
		stream?: Readable
	}
}
