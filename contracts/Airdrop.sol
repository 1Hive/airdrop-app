pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/lib/ens/AbstractENS.sol";
import "@aragon/os/contracts/lib/ens/PublicResolver.sol";

import "@aragon/apps-token-manager/contracts/TokenManager.sol";

contract Airdrop is AragonApp {

    struct Distribution {
      bytes32 root;
      string dataURI;
    }

    /// Events
    event Started(uint id);
    event Awarded(uint id, string username, uint karma, uint currency);

    /// State
    mapping(uint => Distribution) public distributions;
    mapping(bytes32 => uint) public lastClaimed;
    TokenManager public tokenManager;
    uint public distributionsCount;

    /// ACL
    bytes32 constant public START_ROLE = keccak256("START_ROLE");

    // Errors
    string private constant ERROR = "ERROR";
    string private constant ERROR_PERMISSION = "PERMISSION";
    string private constant ERROR_NOT_FOUND = "NOT_FOUND";
    string private constant ERROR_INVALID = "INVALID";

    function initialize(
      address _tokenManager
    ) onlyInit public {
        initialized();

        tokenManager = TokenManager(_tokenManager);
    }

    /**
     * @notice Start a new distribution `_root` / `_dataURI`
     * @param _root New distribution merkle root
     * @param _dataURI Data URI for distribution data
     */
    function start(bytes32 _root, string _dataURI) auth(START_ROLE) public {
        _start(_root, _dataURI);
    }

    function _start(bytes32 _root, string _dataURI) internal returns(uint id){
        id = ++distributionsCount;    // start at 1
        distributions[id] = Distribution(_root, _dataURI);
        emit Started(id);
    }

    /**
     * @notice Award from distribution
     * @param _id Distribution id
     * @param _username Username recepient of award
     * @param _karma The karma amount
     * @param _currency The currency amount
     * @param _proof Merkle proof to correspond to data supplied
     */
    function award(uint _id, string _username, uint256 _karma, uint256 _currency, bytes32[] _proof) public {
        Distribution storage distribution = distributions[_id];

        address recipient = names.ownerOf(_username);
        require( recipient != address(0), ERROR_NOT_FOUND );

        bytes32 hash = keccak256(_username, _karma, _currency);
        require( validate(distribution.root, _proof, hash), ERROR_INVALID );

        bytes32 nameHash = keccak256(_username);

        require( _id > lastClaimed[nameHash], ERROR_PERMISSION );

        lastClaimed[nameHash] = _id;

        tokenManager.mint(recipient, _karma);
        currencyManager.mint(recipient, _currency);

        emit Awarded(_id, _username, _karma, _currency);
    }

    /**
     * @notice Award from distribution
     * @param _ids Distribution ids
     * @param _username Username recepient of award
     * @param _karmaAwards The karma amount
     * @param _currencyAwards The currency amount
     * @param _proofs Merkle proofs
     * @param _proofLengths Merkle proof lengths
     */
    function awardFromMany(uint[] _ids, string _username, uint[] _karmaAwards, uint[] _currencyAwards, bytes _proofs, uint[] _proofLengths) public {
   /* function awardFromMany(uint[] _ids, string _username, uint[] _karmaAwards, uint[] _currencyAwards) public { */

        address recipient = names.ownerOf(_username);
        require( recipient != address(0), ERROR_NOT_FOUND );

        bytes32 nameHash = keccak256(_username);

        uint totalKarmaAward;
        uint totalCurrencyAward;

        uint marker = 32;

        for (uint i = 0; i < _ids.length; i++) {

            uint id = _ids[i];

            bytes32[] memory proof = extractProof(_proofs, marker, _proofLengths[i]);
            marker += _proofLengths[i]*32;

            bytes32 hash = keccak256(_username, _karmaAwards[i], _currencyAwards[i]);
            require( validate(distributions[id].root, proof, hash), ERROR_INVALID );


            require( id > lastClaimed[nameHash], ERROR_PERMISSION );

            lastClaimed[nameHash] = id;

            totalKarmaAward += _karmaAwards[i];
            totalCurrencyAward += _currencyAwards[i];

            emit Awarded(id, _username, _karmaAwards[i], _currencyAwards[i]);

        }

        tokenManager.mint(recipient, totalKarmaAward);
        currencyManager.mint(recipient, totalCurrencyAward);

    }

    /* function testConvertBytes32(bytes32 _username) public constant returns (bytes32){
        bytes memory unpadded = bytes32ToBytes(_username);
        return keccak256( unpadded );
    }

    function testConvertString(string _username) public constant returns (bytes32){
        return keccak256( _username );
    }

    function testBytes32ToString1(bytes32 _bytes32) public pure returns (string){
        return string( bytes32ToBytes(_bytes32) );
    }
    function testBytes32ToString2(bytes32 _bytes32) public pure returns (string){
        return string( bytes32ToBytesWithAssembly(_bytes32) );
    }

    function testOwner1(bytes32[] _bytes32) public view returns (address){
        return names.ownerOf(string( bytes32ToBytes(_bytes32[0]) ));
    }

    function testOwner2(bytes32[] _bytes32) public view returns (address){
        return names.ownerOf(string( bytes32ToBytesWithAssembly(_bytes32[0]) ));
    } */

    /**
     * @notice Award from distribution
     * @param _id Distribution ids
     * @param _usernames Username recepient of award
     * @param _karmaAwards The karma amount
     * @param _currencyAwards The currency amount
     * @param _proofs Merkle proofs
     * @param _proofLengths Merkle proof lengths
     */
    function awardToMany(uint _id, bytes32[] _usernames, uint[] _karmaAwards, uint[] _currencyAwards, bytes _proofs, uint[] _proofLengths) public {

        uint marker = 32;

        for (uint i = 0; i < _usernames.length; i++) {

            string memory username = string( bytes32ToBytes(_usernames[i]) );
            address recipient = names.ownerOf(username);

            /* require( recipient != address(0), ERROR_NOT_FOUND ); */
            if( recipient == address(0) )
                continue;

            bytes32 nameHash = keccak256(username);

            if( _id <= lastClaimed[nameHash] )
                continue;

            lastClaimed[nameHash] = _id;

            bytes32[] memory proof = extractProof(_proofs, marker, _proofLengths[i]);
            marker += _proofLengths[i]*32;

            bytes32 hash = keccak256(username, _karmaAwards[i], _currencyAwards[i]);
            /* require( validate(distributions[_id].root, proof, hash), ERROR_INVALID ); */
            if( !validate(distributions[_id].root, proof, hash) )
                continue;

            tokenManager.mint(recipient, _karmaAwards[i]);
            currencyManager.mint(recipient, _currencyAwards[i]);

            emit Awarded(_id, username, _karmaAwards[i], _currencyAwards[i]);

        }

    }

    function extractProof(bytes _proofs, uint _marker, uint proofLength) public pure returns (bytes32[] proof) {

        proof = new bytes32[](proofLength);

        bytes32 el;

        for (uint j = 0; j < proofLength; j++) {
            assembly {
                el := mload(add(_proofs, _marker))
            }
            proof[j] = el;
            _marker += 32;
        }

    }

    function validate(bytes32 root, bytes32[] proof, bytes32 hash) public pure returns (bool) {

        for (uint i = 0; i < proof.length; i++) {
            if (hash < proof[i]) {
                hash = keccak256(hash, proof[i]);
            } else {
                hash = keccak256(proof[i], hash);
            }
        }

        return hash == root;
    }

    /* function validate(bytes32 root, bytes proof, bytes32 hash) public pure returns (bool) {
      bytes32 el;

      for (uint256 i = 32; i <= proof.length; i += 32) {
          assembly {
              el := mload(add(proof, i))
          }

          if (hash < el) {
              hash = keccak256(hash, el);
          } else {
              hash = keccak256(el, hash);
          }
      }

      return hash == root;
    } */

    /**
     * @notice Check if username:`_username` claimed in distribution:`_id`
     * @param _id Distribution id
     * @param _username Username to check
     */
    function claimed(uint _id, string _username) public view returns(bool) {
        return _id <= lastClaimed[keccak256(_username)];
    }

    /* function bytes32ToBytes(bytes32 data) public pure returns (bytes result) {
        uint len = 0;
        while (len < 32 && uint(data[len]) != 0) {
            ++len;
        }

        result = new bytes(len);
        uint j = 0;
        while (j < len) {
            result[j] = data[j];
            ++j;
        }
        return result;
    } */

    function bytes32ToBytes(bytes32 data) public pure returns (bytes result) {
        uint len = 0;
        while (len < 32 && uint(data[len]) != 0) {
            ++len;
        }

        assembly {
            result := mload(0x40)
            mstore(0x40, add(result, and(add(add(len, 0x20), 0x1f), not(0x1f))))
            mstore(result, len)
            mstore(add(result, 0x20), data)
        }
    }

    /* function bytes32ToString(bytes32 _bytes32) public pure returns (string){

        // string memory str = string(_bytes32);
        // TypeError: Explicit type conversion not allowed from "bytes32" to "string storage pointer"
        // thus we should fist convert bytes32 to bytes (to dynamically-sized byte array)

        bytes memory bytesArray = new bytes(32);
        for (uint256 i; i < 32; i++) {
            bytesArray[i] = _bytes32[i];
        }

        return string(bytesArray);
    } */
}
