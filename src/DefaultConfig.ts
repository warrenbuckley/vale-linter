/**
 * Default config if no YML file found or its malformed
 */
export let defaultConfig:IConfig = {
    Vale: {
      Enabled: false,
      Paths: {
        Configuration: "_vale.ini",
        Styles: "vale/DocsStyles/"
      },
      Success: {
        Header: "Congratulations, there are no errors",
        Message: "The Vale Docs linter did not find any issues",
        ShowImage: true,
        ImageUrl: "https://media.giphy.com/media/6nuiJjOOQBBn2/giphy.gif"
      },
      Error: {
        Header: "Failed automated validation",
        Message: "There are one or more automated warnings with your PR",
        ShowImage: false,
        ImageUrl: ""
      }
    }
  };
