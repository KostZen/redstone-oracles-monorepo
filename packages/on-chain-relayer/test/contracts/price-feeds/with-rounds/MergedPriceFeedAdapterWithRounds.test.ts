import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { describeCommonPriceFeedTests } from "../common/price-feed-utils";
import { describeCommonPriceFeedsAdapterTests } from "../common/price-feeds-adapter-utils";
import { describeCommonMergedPriceFeedAdapterTests } from "../common/merged-price-feed-adapter-utils";

chai.use(chaiAsPromised);

const contractName = "MergedPriceFeedAdapterWithRoundsMock";

describe("MergedPriceFeedAdapterWithRounds", () => {
  describeCommonPriceFeedTests({
    priceFeedContractName: contractName,
    adapterContractName: contractName,
    expectedRoundIdAfterOneUpdate: 1,
  });

  describeCommonPriceFeedsAdapterTests({
    adapterContractName: contractName,
    hasOnlyOneDataFeed: true,
    skipTestsForPrevDataTimestamp: false,
  });

  describeCommonMergedPriceFeedAdapterTests({
    mergedPriceFeedAdapterContractName: contractName,
    updatedContractName: "MergedPriceFeedAdapterWithRoundsUpdatedMock",
    roundsEndabled: true,
  });
});
