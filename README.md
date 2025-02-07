# Youtube-video-analyzer

A sophisticated Node.js application that analyzes YouTube videos for legal compliance by transcribing audio content and comparing it against predefined legal rules.

## Core Features

- YouTube video audio extraction and processing
- Speech-to-text transcription using Deepgram API
- Legal rules extraction from regulatory articles
- Automated compliance analysis using GPT-4
- Multi-language support (optimized for Czech)
- Token cost tracking and optimization

## Technical Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **APIs**:
  - OpenAI GPT-4
  - Deepgram Speech-to-Text
  - YouTube Data API

## Key Components

1. **Video Processing Pipeline**
   - Downloads YouTube videos as audio files
   - Supports chunked processing for large files
   - Handles multi-speaker transcription

2. **Transcription Engine**
   - Uses Deepgram's Nova-2 model
   - Provides paragraph segmentation
   - Speaker diarization
   - Punctuation and formatting

3. **Legal Analysis System**
   - Extracts rules from regulatory documents
   - Performs compliance checking
   - Generates detailed violation reports

## Environment Setup

Required environment variables:
```bash
OPENAI_API_KEY=your_openai_key
DEEPGRAM_API_KEY=your_deepgram_key
```

## Usage

```bash
const videoUrls = [
    "https://www.youtube.com/watch?v=example1",
    "https://www.youtube.com/watch?v=example2"
];
const articleUrl = "https://regulatory-article-url";

await main(videoUrls, articleUrl);
```

## Contributing
- Fork the repository
- Create your feature branch (git checkout -b feature/AmazingFeature)
- Commit your changes (git commit -m 'Add some AmazingFeature')
- Push to the branch (git push origin feature/AmazingFeature)
- Open a Pull Request

## License
This project is licensed under the [LICENSE](https://github.com/0xichikawa/Youtube-video-analyzer/blob/master/LICENSE) - see the LICENSE file for details.
