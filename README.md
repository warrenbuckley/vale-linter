# Vale Linter

## What is this?
This is a tool to automatically lint PRs of Markdown files to ensure they follow a vocabulary style guide and uses GitHub Checks API to highlight errors on the line numbers directly on the PR for contextual feedback.

## What is Vale?
>Vale is a natural language linter that supports plain text, markup (Markdown, reStructuredText, AsciiDoc, and HTML), and source code comments. Vale doesn't attempt to offer a one-size-fits-all collection of rules—instead, it strives to make customization as easy as possible.
https://github.com/errata-ai/vale

## Configuration
After installation create a new file in the default/master branch of your repository at the following location `.github/vale-linter.yml`

*As with all YML files, be careful that line indentations does not catch you out*

### Example YML
```yml
# Configuration of the Vale Linter ProBot tool
# github.com/warrenbuckley/vale-linter

Vale:

  # If this feature is enabled or disabled
  Enabled: true

  Paths:
    # Path to the vale configuration file
    Configuration: "_vale.ini"

    # Path to the folder of Vale docstyles to use/copy
    # NOTE: If you update the styles path in _vale.ini remember to update this path too
    Styles: "vale/DocsStyles/"

  Success: 
    Header: "YAY you done it"
    Message: "The Vale Docs linter did not find any issues WARREN!"
    ShowImage: true
    ImageUrl: "https://media.giphy.com/media/6nuiJjOOQBBn2/giphy.gif"

  Error: 
    Header: "BOOOO it failed"
    Message: "Try again"
    ShowImage: true
    ImageUrl: "https://media.giphy.com/media/r00LEeXVOt0xG/giphy.gif"

```


## Development Setup

```sh
# Install dependencies
npm install

# Run typescript
npm run build

# Run the bot
npm start
```

## Contributing

If you have suggestions for how vale-linter could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[ISC](LICENSE) © 2019 Warren Buckley <warren@umbraco.com>
